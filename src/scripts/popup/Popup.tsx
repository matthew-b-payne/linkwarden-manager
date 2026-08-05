import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Plus, RefreshCcw, FolderPlus, Settings, SquareStack, Folder as FolderIcon, Tag as TagIcon } from 'lucide-react';
import { BarLoader } from 'react-spinners';
import { AddLinkModal } from './components/AddLinkModal';
import { FolderStructure } from './components/FolderStructure';
import { TagStructure } from './components/TagStructure';
import { SearchResults } from './components/SearchResults';
import { SaveSessionModal } from './components/SaveSessionModal';
import { defaultFolderColor, getBrowser, getCurrentTabInfo, getCurrentWindowTabs, getStorageItem, openOptions, setStorageItem } from '../utils/utils';
import { DeleteFolderModal } from './components/DeleteFolderModal';
import { AddFolderModal } from './components/AddFolderModal';
import { Folder, Link, LinksByFolder, NewLink, SaveSessionRequest, SaveSessionResult, SessionTab, Tag } from '../utils/interfaces';
import { ApiReturnType } from '../service-worker/bookmark-manager-service';
import { ResizeGrip } from './components/ResizeGrip';
import { applyDocumentSize, MODAL_MIN_HEIGHT, PopupSize, readPopupSize, resendDocumentSize, savePopupSize } from './popupSize';
import { hasHostAccess, hostOriginPattern, requestHostAccess } from '../utils/hostPermission';

type BrowseMode = 'folders' | 'tags';


const Popup = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [linksByFolder, setLinksByFolder] = useState<LinksByFolder>({});
  const [popupSize, setPopupSize] = useState<PopupSize>(readPopupSize);
  const [openFolders, setOpenFolders] = useState(new Set<number>());
  const [searchQuery, setSearchQuery] = useState('');
  const [browseMode, setBrowseMode] = useState<BrowseMode>('folders');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showEditLinkModal, setShowEditLinkModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [showSaveSessionModal, setShowSaveSessionModal] = useState(false);
  const [sessionTabs, setSessionTabs] = useState<SessionTab[]>([]);
  const [newFolder, setNewFolder] = useState<Folder>({
    id: 0,
    name: '',
    createdAt: '',
    ownerId: 0,
    color: defaultFolderColor
  });
  const [newLink, setNewLink] = useState<NewLink>({
    id: 0,
    url: '',
    title: '',
    description: '',
    collectionId: 0,
    tags: [],
  });
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [hasValidConfiguration, setHasValidConfiguration] = useState(false);
  const [configuredHost, setConfiguredHost] = useState<string | undefined>(undefined);
  // undefined until the permission has actually been read, so the popup doesn't flash the
  // "grant access" screen at users who granted it long ago
  const [hasAccess, setHasAccess] = useState<boolean | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const isLoadingRef = useRef(false);
  const setLoading = useCallback((value: boolean) => {
    isLoadingRef.current = value;
    setIsLoading(value);
  }, []);
  const [linkSort, setLinkSort] = useState("name_ascending");
  const [folderSort, setFolderSort] = useState("name_ascending");
  const [openLinksInNewTab, setOpenLinksInNewTab] = useState(false);
  const updateInterval = 60000; //update links for open folders every 60 seconds if the popup is open

  const loadAllLinks = useCallback(() => {
    console.log("Updating all links");
    setLoading(true);
    getBrowser().runtime.sendMessage({action: 'fetchAllLinksFromAllFolders'}).then((links: ApiReturnType<LinksByFolder>) => {
      console.log("loadAllLinks -> linksByFolder: " + JSON.stringify(links));
      setStorageItem('lastUpdate', Date.now());
      if(links && links.success && links.data) {
        setLinksByFolder(links.data);
        setStorageItem('linksByFolder', links.data);
      }
      return getBrowser().runtime.sendMessage({action: 'fetchFolders'});
    }).then((folders: ApiReturnType<Folder[]>) => {
      console.log("loadAllLinks -> allFolders: " + JSON.stringify(folders));
      if(folders && folders.success && folders.data) {
        setFolders(folders.data);
        setStorageItem('allFolders', folders.data);
        setOpenFolders((prevOpenFolders) => {
          // clean up the list of open folders in case a folder or its parent was deleted
          const newOpenFolders = new Set(prevOpenFolders);
          prevOpenFolders.forEach((folder) => {
            if(!folders.data.find((f) => f.id == folder)) {
              newOpenFolders.delete(folder);
            }
          });
          setStorageItem('openFolders', Array.from(newOpenFolders));
          return newOpenFolders;
        });
      }
      setLoading(false);
    });
  }, [setLoading]);

  useEffect(() => {
    let timerId;
    console.log('Popup Loaded');

    getBrowser().runtime.sendMessage({action: 'hasValidConfiguration'}).then(setHasValidConfiguration);
    getStorageItem('host').then((storedHost: string | undefined) => {
      setConfiguredHost(storedHost);
      return hasHostAccess(storedHost).then(setHasAccess);
    });

    getStorageItem('sortLinks').then(setLinkSort);
    getStorageItem('sortFolders').then(setFolderSort);
    getStorageItem('openFolders').then((openFoldersTemp) => {
      console.log("Open Folders: " + JSON.stringify(openFoldersTemp));
      if(openFoldersTemp) {
        setOpenFolders(new Set(openFoldersTemp));
      }
    });
    getStorageItem('openNewTab').then(setOpenLinksInNewTab);
    getStorageItem('browseMode').then((mode) => {
      if (mode === 'folders' || mode === 'tags') {
        setBrowseMode(mode);
        if (mode === 'tags') {
          getBrowser().runtime.sendMessage({ action: 'fetchTags' }).then((tags: ApiReturnType<Tag[]>) => {
            if (tags && tags.success && tags.data) {
              setAllTags(tags.data);
            }
          });
        }
      }
    });


    getStorageItem('linksByFolder').then((linksByFolderTemp) => {
      if(linksByFolderTemp) {
        setLinksByFolder(linksByFolderTemp);
      }
      return getStorageItem('allFolders');  // these Promises should be resolved in this order to avoid overwriting the states in the wrong order
    }).then((foldersTemp) => {
      if(foldersTemp) {
        setFolders(foldersTemp);
      }
      return getStorageItem('lastUpdate');
    }).then((lastUpdateTemp) => {
      // this has to be the last Promise to be resolved to make sure the API call overwrites the cached values
      // otherwise this could lead to wrong states if the API call is for some reason faster than the storage read
      if(!!lastUpdateTemp) {
        if (Date.now() - lastUpdateTemp >= updateInterval) {
          console.log("Should update all links");
          setTimeout(() => loadAllLinks(), 100);  // we have to defer the call to make sure host and token are set
        }
      }
      else {
        console.log("lastUpdate not set - Should update all links");
        setTimeout(() => loadAllLinks(), 100);
      }
    });

    timerId = setInterval(() => {
      if (document.visibilityState === 'visible' && !isLoadingRef.current) {
        loadAllLinks();
      }
    }, updateInterval);

    return () => {
      clearInterval(timerId);
    };
  }, [loadAllLinks]);

  const openAddLinkModal = useCallback(() => {
    getCurrentTabInfo().then((tabinfo) => {
      const unorganized = folders.find(
        (folder) => folder.name === 'Unorganized',
      );
      setNewLink({
        url: tabinfo.url,
        title: tabinfo.title || '',
        description: '',
        collectionId: unorganized ? unorganized.id : folders[0]?.id ?? 0,
        tags: [],
        id: 0,
      });

      return getBrowser().runtime.sendMessage({action: 'fetchTags'});
    }).then((tags: ApiReturnType<Tag[]>) => {
      if(tags.success && tags.data) {
        setAllTags(tags.data);
      }
      setShowAddLinkModal(true);
    });
  }, [folders]);

  useEffect(() => {
    // set by the add_current_tab keyboard shortcut before it force-opens this popup —
    // consume it once so a plain click on the toolbar icon never re-triggers the modal
    getStorageItem('pendingAddLink').then((pending) => {
      if (pending) {
        setStorageItem('pendingAddLink', false);
        openAddLinkModal();
      }
    });
  }, [openAddLinkModal]);
  const openAddFolderModal = useCallback(() => {
    setNewFolder({
      id: 0,
      name: '',
      createdAt: '',
      ownerId: 0,
      parentId: 0,
      color: defaultFolderColor
    });

    getBrowser().runtime.sendMessage({action: 'fetchFolders'}).then((newFolders: ApiReturnType<Folder[]>) => {
      if(newFolders.success && newFolders.data) {
        setFolders(newFolders.data);
      }
      setShowAddFolderModal(true);
    });
  }, []);

  const loadLinksForFolder = useCallback((folderId: number) => {
    console.log("loadLinksForFolder");
    setLoading(true);
    getBrowser().runtime.sendMessage({action: 'fetchLinks', collectionId: folderId}).then((links: ApiReturnType<Link[]>) => {
      if (links.success && links.data) {
        setLinksByFolder((prev) => {
          const newLinksByFolder = ({
            ...prev,
            [folderId]: links.data,
          });
          setStorageItem('linksByFolder', newLinksByFolder);
          console.log("loadLinksForFolder -> linksByFolder:" + JSON.stringify(newLinksByFolder));
          return newLinksByFolder;
        });
      }
      setLoading(false);
    });
  }, [setLoading]);

  const toggleFolder = useCallback(
    (folderId: number) => {
      setOpenFolders((prevOpenFolders) => {
        const newOpenFolders = new Set(prevOpenFolders);
        if (newOpenFolders.has(folderId)) {
          newOpenFolders.delete(folderId);
        } else {
          newOpenFolders.add(folderId);
          loadLinksForFolder(folderId);
        }
        setStorageItem('openFolders', Array.from(newOpenFolders));
        return newOpenFolders;
      });
    },
    [loadLinksForFolder],
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };


  const filteredLinks = Object.values(linksByFolder).flat().filter(
    (link) =>
      link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (link.description &&
        link.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (link.tags &&
        link.tags.some((tag) =>
          tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )),
  );

  const allCachedLinks = useMemo(
    () => Object.values(linksByFolder).flat(),
    [linksByFolder],
  );

  const browseTags = useMemo(() => {
    if (allTags.length > 0) {
      return allTags;
    }
    // Fallback from cached links when the tag list hasn't been fetched yet
    const byId = new Map<number, Tag>();
    allCachedLinks.forEach((link) => {
      (link.tags || []).forEach((tag) => {
        if (tag.id && !byId.has(tag.id)) {
          byId.set(tag.id, tag);
        }
      });
    });
    return Array.from(byId.values());
  }, [allTags, allCachedLinks]);

  const linksForSelectedTag = useMemo(() => {
    if (selectedTagId == null) {
      return [];
    }
    return allCachedLinks.filter(
      (link) => link.tags && link.tags.some((tag) => tag.id === selectedTagId),
    );
  }, [allCachedLinks, selectedTagId]);

  const ensureTagsLoaded = useCallback(() => {
    getBrowser().runtime.sendMessage({ action: 'fetchTags' }).then((tags: ApiReturnType<Tag[]>) => {
      if (tags && tags.success && tags.data) {
        setAllTags(tags.data);
      }
    });
  }, []);

  const switchBrowseMode = useCallback((mode: BrowseMode) => {
    setBrowseMode(mode);
    setStorageItem('browseMode', mode);
    if (mode === 'tags') {
      ensureTagsLoaded();
    } else {
      setSelectedTagId(null);
    }
  }, [ensureTagsLoaded]);


  const closeAddLinkModal = () => {
    setShowAddLinkModal(false);
  };

  const closeEditLinkModal = () => {
    setShowEditLinkModal(false);
  };

  const closeAddFolderModal = () => {
    setShowAddFolderModal(false);
  };

  const closeDeleteFolderModal = () => {
    setShowDeleteFolderModal(false);
  };

  const closeEditFolderModal = () => {
    setShowEditFolderModal(false);
  };

  const handleNewLinkChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setNewLink((prev) => ({ ...prev, [name]: value }));
  };


  const handleNewFolderChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setNewFolder((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagChange = (newTags: string[]) => {
    console.log("handleTagChange: " + newTags);
    const filteredNewTags = newTags.filter((tag) => tag.length <= 50);  // tag names can have a max length of 50 characters
    filteredNewTags.forEach((newTag) => {
      if(!allTags.some((tag) => tag.name === newTag)) { // add new elements to the list of all tags if they are not included yet
        setAllTags((prevAllTags) => {
          let newAllTags = [...prevAllTags, {id: 0, name: newTag}];
          return newAllTags;
        });
      }
    });
    setNewLink((prev) => ({ ...prev, tags: filteredNewTags }));
  };


  const saveNewLink = (e: React.FormEvent) => {
    e.preventDefault();
    getBrowser().runtime.sendMessage({action: 'saveLink', link: newLink}).then((result: ApiReturnType<any>) => {
      if (result.success) {
          closeAddLinkModal();
          if(newLink.collectionId > 0) {
            loadLinksForFolder(newLink.collectionId);
          } else {
            loadAllLinks();
          }
        } else {
          alert('Error saving link. Please try again.');
        }
    });
  };
  const saveNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    getBrowser().runtime.sendMessage({action: 'createFolder', name: newFolder.name, parentId: newFolder.parentId}).then((result: ApiReturnType<any>) => {
      if (result.success) {
          closeAddFolderModal();
          loadAllLinks();
        } else {
          alert('Error saving folder. Please try again.');
        }
    });
  };

  const handleCreateFolderFromLinkModal = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsCreatingFolder(true);
    // Paths like "AI/analysis" are expanded server-side into nested folders under root.
    getBrowser().runtime.sendMessage({action: 'createFolder', name: trimmed, parentId: 0}).then((result: ApiReturnType<unknown>) => {
      if (result.success && result.data != null) {
        let newFolderId: number | null = null;
        if (typeof result.data === 'number') {
          newFolderId = result.data;
        } else if (typeof result.data === 'object' && result.data && 'id' in result.data) {
          const rawId = result.data.id;
          if (typeof rawId === 'number') {
            newFolderId = rawId;
          } else if (typeof rawId === 'string') {
            const n = Number(rawId);
            newFolderId = Number.isFinite(n) ? n : null;
          }
        }
        // fetch fresh folder list then select the new (leaf) folder
        getBrowser().runtime.sendMessage({action: 'fetchFolders'}).then((foldersResult: ApiReturnType<Folder[]>) => {
          if (foldersResult.success && foldersResult.data) {
            setFolders(foldersResult.data);
            setStorageItem('allFolders', foldersResult.data);
            if (newFolderId != null) {
              setNewLink((prev) => ({ ...prev, collectionId: newFolderId }));
            }
          }
        });
      } else {
        alert('Error creating folder. Please try again.');
      }
      setIsCreatingFolder(false);
    }).catch(() => {
      alert('Error creating folder. Please try again.');
      setIsCreatingFolder(false);
    });
  }, []);


  const openEditLinkModal = useCallback((link: NewLink) => {
    setNewLink(link);

    getBrowser().runtime.sendMessage({action: 'fetchTags'}).then((tags: ApiReturnType<Tag[]>) => {
      if (tags.success && tags.data) {
        setAllTags(tags.data);
      }
      setShowEditLinkModal(true);
    });
  }, []);

  const openEditFolderModal = useCallback((folder: Folder) => {
    setNewFolder(folder);

    getBrowser().runtime.sendMessage({action: 'fetchFolders'}).then((newFolders: ApiReturnType<Folder[]>) => {
      if(newFolders.success && newFolders.data) {
        setFolders(newFolders.data);
      }
      setShowEditFolderModal(true);
    });
  }, []);

  const openDeleteFolderModal = useCallback((folder: Folder) => {
    setNewFolder(folder);
    setShowDeleteFolderModal(true);
  }, []);

  const saveEditLink = (e: React.FormEvent) => {
    e.preventDefault();
    getBrowser().runtime.sendMessage({action: 'updateLink', data: newLink, collectionOwnerId: folders.filter((folder) => folder.id == newLink.collectionId)[0].ownerId}).then((response: ApiReturnType<any>) => {
      if (response.success) {
        closeEditLinkModal();
        loadAllLinks();
      } else {
        alert('Error updating link. Please try again.');
      }
    });
  };

  const saveEditFolder = (e: React.FormEvent) => {
    e.preventDefault();
    getBrowser().runtime.sendMessage({action: 'updateFolder', id: newFolder.id, name: newFolder.name, parentId: newFolder.parentId ?? 0}).then((response: ApiReturnType<any>) => {
      if (response.success) {
        closeEditFolderModal();
        loadAllLinks();
      } else {
        alert('Error updating folder. Please try again.');
      }
    });
  };

  const openSaveSessionModal = useCallback(() => {
    getCurrentWindowTabs().then((tabs) => {
      setSessionTabs(tabs);
      return getBrowser().runtime.sendMessage({action: 'fetchTags'});
    }).then((tags: ApiReturnType<Tag[]>) => {
      if (tags.success && tags.data) {
        setAllTags(tags.data);
      }
      setShowSaveSessionModal(true);
    });
  }, []);

  const closeSaveSessionModal = () => {
    setShowSaveSessionModal(false);
  };

  const saveSession = useCallback((req: SaveSessionRequest): Promise<ApiReturnType<SaveSessionResult>> => {
    return getBrowser().runtime.sendMessage({action: 'saveSession', data: req}).then((result: ApiReturnType<SaveSessionResult>) => {
      if (result && result.success) {
        loadAllLinks();  // refresh so the new session folder and its links show up
        return result;
      }
      // preserve the failure reason (or synthesize one) so the modal can show it instead of hanging
      return result ?? { success: false, data: 'No response from the extension background. Try reloading the extension.' };
    }).catch((error) => {
      console.error('Error saving session:', error);
      return { success: false, data: String(error?.message ?? error) };
    });
  }, [loadAllLinks]);

  const openAllInFolder = useCallback((folderId: number) => {
    // fetch the folder's links fresh so restore works even for collapsed/uncached folders
    getBrowser().runtime.sendMessage({action: 'fetchLinks', collectionId: folderId}).then((res: ApiReturnType<Link[]>) => {
      if (!res.success || !res.data) {
        return;
      }
      const urls = res.data.map((link) => link.url);
      if (urls.length === 0) {
        return;
      }
      getBrowser().windows.create({url: urls});
    });
  }, []);

  // Drag & drop target handler: moves a link into another folder. The local cache is updated
  // first so the tree reacts instantly, and rolled back verbatim if the API call fails — a
  // reload can't be used for that, since the same outage that failed the move fails the reload
  // and would leave the optimistic state on screen as if the move had worked.
  const moveLinkToFolder = useCallback((linkId: number, targetFolderId: number) => {
    const targetFolder = folders.find((folder) => folder.id === targetFolderId);
    if (!targetFolder) {
      return;
    }

    let link: Link | undefined;
    let sourceKey = '';
    for (const key of Object.keys(linksByFolder)) {
      const found = linksByFolder[key].find((candidate) => candidate.id === linkId);
      if (found) {
        link = found;
        sourceKey = key;
        break;
      }
    }
    if (!link || sourceKey === String(targetFolderId)) {
      return;
    }

    const optimistic: LinksByFolder = {
      ...linksByFolder,
      [sourceKey]: linksByFolder[sourceKey].filter((candidate) => candidate.id !== linkId),
      [targetFolderId]: [...(linksByFolder[targetFolderId] || []), { ...link, folder: targetFolder }],
    };
    setLinksByFolder(optimistic);
    setStorageItem('linksByFolder', optimistic);

    const movedLink: NewLink = {
      id: link.id,
      url: link.url,
      title: link.name,
      description: link.description || '',
      collectionId: targetFolderId,
      tags: link.tags.map((tag) => tag.name),
    };
    const rollback = linksByFolder;
    getBrowser().runtime.sendMessage({action: 'updateLink', data: movedLink, collectionOwnerId: targetFolder.ownerId}).then((response: ApiReturnType<any>) => {
      if (!response || !response.success) {
        setLinksByFolder(rollback);
        setStorageItem('linksByFolder', rollback);
        alert('Error moving link: ' + (response ? response.data : 'no response from the extension background'));
      }
    });
  }, [folders, linksByFolder]);

  const openLinkwarden = () => {
    getStorageItem('host').then((host) => {
      getBrowser().tabs.create({'url': host});
    });
  };

  const isAnyModalShown = showAddLinkModal || showDeleteFolderModal || showEditLinkModal || showAddFolderModal || showEditFolderModal || showSaveSessionModal;
  // Modals are `fixed inset-0`, so the window itself has to stay tall enough to hold one.
  const documentSize: PopupSize = {
    width: popupSize.width,
    height: isAnyModalShown ? Math.max(popupSize.height, MODAL_MIN_HEIGHT) : popupSize.height,
  };

  useEffect(() => {
    applyDocumentSize(documentSize);
  }, [documentSize.width, documentSize.height]);

  const commitPopupSize = useCallback((size: PopupSize) => {
    setPopupSize(size);
    savePopupSize(size);
    resendDocumentSize(size);
  }, []);

  // Chrome grants access to the Linkwarden host at runtime rather than at install (see
  // utils/hostPermission). A popup click is a user gesture, so the grant can be asked for here
  // instead of sending the user to Options for a permission they already meant to give.
  const grantHostAccess = async () => {
    const granted = await requestHostAccess(configuredHost);
    setHasAccess(granted);
    if (granted) {
      loadAllLinks();
    }
  };

  if (hasValidConfiguration && hasAccess === false) {
    return (
      <div className="w-96 p-6 text-center bg-base-200 text-base-content">
        <div className="text-base font-medium">Allow access to your Linkwarden</div>
        <p className="mt-2 text-sm text-muted">
          The extension needs permission to reach {hostOriginPattern(configuredHost) ?? 'your instance'}.
          It is never used for any other site.
        </p>
        <button
          type="button"
          onClick={grantHostAccess}
          className="mt-4 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-content text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Grant access
        </button>
      </div>
    );
  }

  if(hasValidConfiguration) {
    return (
      <div className="relative flex flex-col h-full p-4 bg-base-200 text-base-content">
        <div className="flex items-center shrink-0">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Search links..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 rounded-md border text-sm bg-surface border-border text-base-content focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
              size={20}
            />
          </div>
          <button
            onClick={openAddLinkModal}
            title='Add link'
            className="ml-2 p-2 rounded-md bg-primary hover:bg-primary-hover text-primary-content focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Plus size={20} />
          </button>
          <button
            onClick={openAddFolderModal}
            title='Add new folder'
            className="ml-2 p-2 rounded-md bg-primary hover:bg-primary-hover text-primary-content focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <FolderPlus size={20} />
          </button>
          <button
            onClick={openSaveSessionModal}
            title='Save all tabs'
            className="ml-2 p-2 rounded-md bg-primary hover:bg-primary-hover text-primary-content focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <SquareStack size={20} />
          </button>
          <button
            onClick={loadAllLinks}
            title='Refresh'
            className="ml-2 p-2 rounded-md bg-base-300 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-muted"
          >
            <RefreshCcw size={20} />
          </button>
          <button
            onClick={openOptions}
            title='Open Settings'
            className="ml-2 p-2 rounded-md bg-base-300 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-muted"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={openLinkwarden}
            title='Open LinkWarden Dashboard'
            className="ml-2 p-2 rounded-md bg-base-300 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-muted"
          >
            <img src='/assets/icon-48.png' width='32' height='32' alt='Open Linkwarden' />
          </button>
        </div>
        <div className="mt-2 flex rounded-md border border-border overflow-hidden text-sm shrink-0">
          <button
            type="button"
            onClick={() => switchBrowseMode('folders')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 focus:outline-none ${
              browseMode === 'folders'
                ? 'bg-primary text-primary-content'
                : 'bg-surface text-base-content hover:bg-surface-hover'
            }`}
          >
            <FolderIcon size={16} />
            Folders
          </button>
          <button
            type="button"
            onClick={() => switchBrowseMode('tags')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 focus:outline-none ${
              browseMode === 'tags'
                ? 'bg-primary text-primary-content'
                : 'bg-surface text-base-content hover:bg-surface-hover'
            }`}
          >
            <TagIcon size={16} />
            Tags
          </button>
        </div>
        <div className="flex justify-center mb-4 h-[4px] shrink-0">
          <BarLoader width={"350px"} loading={isLoading} color={'var(--lw-loader)'} />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {searchQuery ? (
            <SearchResults
              links={filteredLinks}
              loadLinksForFolder={loadLinksForFolder}
              sortLinks={linkSort}
              showEditLinkModal={openEditLinkModal}
              canShowOverlayButtons={!isAnyModalShown}
              openLinksInNewTab={openLinksInNewTab}
            />
          ) : browseMode === 'tags' ? (
            <TagStructure
              tags={browseTags}
              allLinks={allCachedLinks}
              selectedTagId={selectedTagId}
              onSelectTag={setSelectedTagId}
              linksForTag={linksForSelectedTag}
              loadLinksForFolder={loadLinksForFolder}
              sortLinks={linkSort}
              showEditLinkModal={openEditLinkModal}
              canShowOverlayButtons={!isAnyModalShown}
              openLinksInNewTab={openLinksInNewTab}
            />
          ) : (
            <FolderStructure
              folders={folders}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
              linksByFolder={linksByFolder}
              loadLinksForFolder={loadLinksForFolder}
              sortLinks={linkSort}
              sortFolders={folderSort}
              showEditLinkModal={openEditLinkModal}
              showEditFolderModal={openEditFolderModal}
              showDeleteFolderModal={openDeleteFolderModal}
              openAllInFolder={openAllInFolder}
              canShowOverlayButtons={!isAnyModalShown}
              openLinksInNewTab={openLinksInNewTab}
              onMoveLink={moveLinkToFolder}
            />
          )}
        </div>
        {showAddLinkModal && (
          <AddLinkModal
            newLink={newLink}
            allTags={allTags}
            allFolders={folders}
            handleNewLinkChange={handleNewLinkChange}
            handleTagChange={handleTagChange}
            saveNewLink={saveNewLink}
            closeAddLinkModal={closeAddLinkModal}
            onCreateFolder={handleCreateFolderFromLinkModal}
            isCreatingFolder={isCreatingFolder}
          />
        )}
        {showEditLinkModal && (
          <AddLinkModal
            newLink={newLink}
            allTags={allTags}
            allFolders={folders}
            handleNewLinkChange={handleNewLinkChange}
            handleTagChange={handleTagChange}
            saveNewLink={saveEditLink}
            closeAddLinkModal={closeEditLinkModal}
            onCreateFolder={handleCreateFolderFromLinkModal}
            isCreatingFolder={isCreatingFolder}
          />
        )}
        {showAddFolderModal && (
          <AddFolderModal
            newFolder={newFolder}
            allFolders={folders}
            handleNewFolderChange={handleNewFolderChange}
            saveNewFolder={saveNewFolder}
            closeAddFolderModal={closeAddFolderModal}
          />
        )}
        {showDeleteFolderModal && (
          <DeleteFolderModal
            folder={newFolder}
            refreshData={loadAllLinks}
            closeModal={closeDeleteFolderModal}
          />
        )}
        {showEditFolderModal && (
          <AddFolderModal
            newFolder={newFolder}
            allFolders={folders}
            handleNewFolderChange={handleNewFolderChange}
            saveNewFolder={saveEditFolder}
            closeAddFolderModal={closeEditFolderModal}
          />
        )}
        {showSaveSessionModal && (
          <SaveSessionModal
            tabs={sessionTabs}
            allFolders={folders}
            allTags={allTags}
            saveSession={saveSession}
            closeModal={closeSaveSessionModal}
          />
        )}
        <ResizeGrip size={popupSize} onResize={setPopupSize} onCommit={commitPopupSize} />
      </div>
    );
  }
  else {
    return (
    <div style={{textAlign:"center"}} className="w-96 p-4 bg-base-200 text-base-content">
      <div style={{fontSize:"16px"}}>Please configure the extension first!</div>
      <br></br>
      <button
        type="button"
        onClick={openOptions}
        className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-content text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Open Options
      </button>
    </div>
    );
  }
};

export default Popup;
