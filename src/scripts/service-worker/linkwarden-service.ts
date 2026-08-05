import { Folder, Link, LinksByFolder, NewLink, SaveSessionRequest, SaveSessionResult, Tag } from "../utils/interfaces";
import { defaultFolderColor, normalizeColor } from "../utils/utils";
import { ApiReturnType, BookmarkManagerService } from "./bookmark-manager-service";

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function readCreatedFolderId(data: unknown): number | null {
  if (typeof data === 'number' && Number.isFinite(data)) {
    return data;
  }
  if (data && typeof data === 'object' && 'id' in data) {
    const id = data.id;
    if (typeof id === 'number' && Number.isFinite(id)) {
      return id;
    }
    if (typeof id === 'string' && id.trim() !== '') {
      const n = Number(id);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

interface FetchFolderInfo {
  id: number;
  name: string;
  ownerId: number;
  parentId: number;
  createdAt: string;
  icon?: string;
  iconWeight?: string;
  color: string;
}

interface FetchFoldersResponse {
  response: FetchFolderInfo[];
}

interface FetchFolderResponse {
  response: FetchFolderInfo;
}

interface FetchLinksResponse {
  data:{
    nextCursor: number;
    links: {
      id: number;
      name: string;
      url: string;
      description?: string;
      importDate?: string;
      createdAt: string;
      tags: {
        id: number;
        name: string;
      }[];
      collection: FetchFolderInfo;
    }[];
  };
  response?: string;
}


interface FetchTagsResponse {
  data: {
    nextCursor: number;
    tags: {
      id: number;
      name: string;}[];
  };
  response?: string;
}

interface CreateLinkRequest {
  name: string;
  url: string;
  description?: string;
  type: string;
  collection: {
    id: number;
  };
  tags: {
    name: string;
  }[];
}

interface UpdateLinkRequest extends Omit<CreateLinkRequest, 'type'> {
  id: number;
  description?: string;
  collection: {
    id: number;
    ownerId: number;
  };
}

interface CreateFolderRequest {
  name: string;
  parentId: number;
}

interface UpdateFolderRequest extends Omit<CreateFolderRequest, 'parentId'> {
  id: number;
  parentId: string | number;
}

export class LinkwardenService implements BookmarkManagerService {
  host: string;
  token: string;

  constructor(host: string, token: string) {
    this.host = host;
    this.token = token;
  }

  async fetchFolders(): Promise<ApiReturnType<Folder[]>> {
    try {
      const response = await fetch(`${this.host}/api/v1/collections`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        credentials: "omit",
      });
      const data: FetchFoldersResponse = await response.json();
      if(response.status !== 200) {
        throw 'Could not fetch folders: ' + data.response;
      }
      const result: Folder[] = data.response.map((value) => ({
        id: value.id,
        name: value.name,
        ownerId: value.ownerId,
        parentId: value.parentId,
        createdAt: value.createdAt,
        icon: value.icon,
        iconWeight: value.iconWeight,
        color: normalizeColor(value.color)
      }));
      return {success: true, data: result};
    } catch (error) {
      console.error('Error fetching folders: ', error);
      return {success: false, data: errorToMessage(error)};
    }
  }

  async _fetchFolderData(id: number): Promise<ApiReturnType<any>> {
    try {
      const response = await fetch(`${this.host}/api/v1/collections/${id}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        credentials: "omit",
      });
      const data: FetchFolderResponse = await response.json();
      if(response.status !== 200) {
        throw 'Could not fetch folders: ' + data.response;
      }
      return {success: true, data: data.response};
    } catch (error) {
      console.error('Error fetching folders: ', error);
      return {success: false, data: errorToMessage(error)};
    }
  }

  async _fetchLinksWithCursor(cursor: number, collectionId?: number): Promise<ApiReturnType<Link[]>> {
    try {
      const collectionParam = collectionId != null ? `&collectionId=${collectionId}` : '';
      const response = await fetch(
        `${this.host}/api/v1/search?cursor=${cursor}&sort=0${collectionParam}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          credentials: "omit",
        },
      );
      const data: FetchLinksResponse = await response.json();
      if(response.status !== 200) {
        throw 'Could not fetch links: ' + data.response;
      }
      const result: Link[] = data.data.links.map((value) => ({
        id: value.id,
        name: value.name,
        url: value.url,
        description: value.description || '',
        createdAt: value.importDate || value.createdAt, // the importDate is set if an entry is imported into LinkWarden, it is the date when the link was saved the first time
        tags: value.tags.map((tag) => ({id: tag.id, name: tag.name})),
        folder: ({
          id: value.collection.id,
          name: value.collection.name,
          ownerId: value.collection.ownerId,
          createdAt: value.collection.createdAt,
          icon: value.collection.icon,
          iconWeight: value.collection.iconWeight,
          color: normalizeColor(value.collection.color)
        })
      }));

      return {success: true, data: result, additionalData: data.data.nextCursor};
    } catch (error) {
      console.error('Error fetching links: ', error);
      return {success: false, data: errorToMessage(error)};
    }
  }

  async fetchLinks(collectionId: number): Promise<ApiReturnType<Link[]>> {
    let cursor: number | null = 0;
    let count = 0;
    const allLinks: Link[] = [];

    while(true) {
      const result = await this._fetchLinksWithCursor(cursor, collectionId);
      if (result.success === false) {
        return {success: false, data: result.data, additionalData: collectionId};
      }
      allLinks.push(...result.data);

      cursor = typeof result.additionalData === 'number' ? result.additionalData : null;

      if(cursor == null) {
        break;
      }

      if(count++ >= 200) {  // each request will return at most 50 elements
        console.warn("Aborting link fetch after 10000 elements. Consider moving links into subcollections.");
        break;
      }
    }

    return {success: true, data: allLinks, additionalData: collectionId};
  }

  async _fetchTagsWithCursor(cursor: number): Promise<ApiReturnType<Tag[]>> {
    try {
      const response = await fetch(`${this.host}/api/v1/tags?cursor=${cursor}&sort=0`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        credentials: "omit",
      });
      const data: FetchTagsResponse = await response.json();
      if(response.status !== 200) {
        throw 'Could not fetch tags: ' + data.response;
      }
      const result: Tag[] = data.data.tags.map((value) => ({id: value.id, name: value.name}));
      return {success: true, data: result, additionalData: data.data.nextCursor};
    } catch (error) {
      console.error('Error fetching tags: ', error);
      return {success: false, data: errorToMessage(error)};
    }
  }

  async fetchTags(): Promise<ApiReturnType<Tag[]>> {
    let cursor: number | null = 0;
    let count = 0;
    const allTags: Tag[] = [];

    while(true) {
      const result = await this._fetchTagsWithCursor(cursor);
      if (result.success === false) {
        return {success: false, data: result.data};
      }
      allTags.push(...result.data);

      cursor = typeof result.additionalData === 'number' ? result.additionalData : null;

      if(cursor == null) {
        break;
      }

      if(count++ >= 200) {  // each request will return at most 50 elements
        console.warn("Aborting link fetch after 10000 elements. Consider moving links into subcollections.");
        break;
      }
    }

    return {success: true, data: allTags};
  }

  async saveLink(link: NewLink): Promise<ApiReturnType<any>> {
    try {
      const request: CreateLinkRequest = {
        name: link.title,
        url: link.url,
        description: link.description?.trim() ? link.description.trim() : undefined,
        type: "url",
        collection: {id: +(link.collectionId)},
        tags: link.tags.map((value) => ({name: value}))
      };
      const response = await fetch(`${this.host}/api/v1/links`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        credentials: "omit",
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if(response.status !== 200) {
        throw 'Could not save link: ' + data.response;
      }
      return { success: true, data: data.response };
    } catch (error) {
      console.error('Error saving link: ', error);
      return { success: false, data: errorToMessage(error) };
    }
  }


  // returns the id of a collection with the given name under parentId, creating it if missing
  async _findOrCreateFolder(name: string, parentId: number): Promise<ApiReturnType<number>> {
    const folders = await this.fetchFolders();
    if (!folders.success) {
      return { success: false, data: typeof folders.data === 'string' ? folders.data : 'Failed to fetch folders' };
    }
    const existing = folders.data.find(
      (f) =>
        f.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0 &&
        (f.parentId ?? 0) === parentId,
    );
    if (existing) {
      return { success: true, data: existing.id };
    }
    // Single segment only — path create goes through createFolder publicly.
    const created = await this._createFolderSegment(name, parentId);
    if (!created.success) {
      return { success: false, data: typeof created.data === 'string' ? created.data : 'Failed to create folder' };
    }
    const createdId = readCreatedFolderId(created.data);
    if (createdId == null) {
      return { success: false, data: 'Created folder but could not read its id' };
    }
    return { success: true, data: createdId };
  }



  async saveSession(req: SaveSessionRequest): Promise<ApiReturnType<SaveSessionResult>> {
    try {
      // 1. resolve the target collection, creating a (optionally nested) new one if needed
      let collectionId: number;
      if (req.destination.type === 'existing') {
        collectionId = req.destination.collectionId;
      } else {
        let parentId = 0;
        if (req.destination.nestUnderSessions) {
          const parent = await this._findOrCreateFolder('Sessions', 0);
          if (!parent.success) {
            throw 'Could not create Sessions folder: ' + parent.data;
          }
          parentId = parent.data;
        }
        const created = await this.createFolder(req.destination.name, parentId);
        if (!created.success) {
          throw 'Could not create session folder: ' + created.data;
        }
        const createdId = readCreatedFolderId(created.data);
        if (createdId == null) {
          throw 'Could not create session folder: missing id';
        }
        collectionId = createdId;
      }

      // 2. create the links one at a time. Sequential (not parallel) is deliberate:
      // concurrent creates that share a brand-new tag race on the server and return 500s
      // (the same tag name gets created multiple times at once). Going in order lets the
      // first create make the tag and the rest reuse it. Best-effort with a single retry
      // so one transient failure doesn't drop a tab.
      const failedUrls: string[] = [];
      for (const tab of req.tabs) {
        const link = { id: 0, url: tab.url, title: tab.title, collectionId, tags: req.tags };
        let res = await this.saveLink(link);
        if (!res.success) {
          res = await this.saveLink(link);  // retry once
        }
        if (!res.success) {
          failedUrls.push(tab.url);
        }
      }

      return {
        success: true,
        data: {
          collectionId,
          saved: req.tabs.length - failedUrls.length,
          failed: failedUrls.length,
          failedUrls,
        },
      };
    } catch (error) {
      console.error('Error saving session: ', error);
      return { success: false, data: errorToMessage(error) };
    }
  }

  async deleteLink(linkId: number): Promise<ApiReturnType<any>> {
    try {
      const response = await fetch(`${this.host}/api/v1/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        credentials: "omit",
      });
      const data = await response.json();
      if(response.status !== 200) {
        throw 'Could not delete link: ' + data.response;
      }
      return { success: true, data: data.response };
    } catch (error) {
      console.error('Error deleting link: ', error);
      return { success: false, data: errorToMessage(error) };
    }
  }

  async updateLink(
    link: NewLink,
    collectionOwnerId: string
  ): Promise<ApiReturnType<any>> {
    try {
      const request: UpdateLinkRequest = {
        id: +(link.id),
        name: link.title,
        url: link.url,
        description: link.description?.trim(),
        collection: {id: +(link.collectionId), ownerId: +(collectionOwnerId)},
        tags: link.tags.map((value) => ({name: value}))
      };
      const response = await fetch(`${this.host}/api/v1/links/${link.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        credentials: "omit",
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if(response.status !== 200) {
        throw 'Could not update link: ' + data.response;
      }
      return { success: true, data: data.response };
    } catch (error) {
      console.error('Error updating link: ', error);
      return { success: false, data: errorToMessage(error) };
    }
  }

  async fetchAllLinksFromAllFolders(): Promise<ApiReturnType<LinksByFolder>> {
    // fetches links across all collections in a single unscoped, cursor-paginated stream
    // (omitting collectionId makes the Linkwarden /search endpoint return links from every
    // collection the user has access to) instead of firing one pagination chain per folder
    let cursor: number | null = 0;
    let count = 0;
    const allLinks: LinksByFolder = {};

    try {
      while(true) {
        const result = await this._fetchLinksWithCursor(cursor);
        if (result.success === false) {
          return { success: false, data: result.data };
        }

        result.data.forEach((link) => {
          (allLinks[link.folder.id] ??= []).push(link);
        });

        cursor = typeof result.additionalData === 'number' ? result.additionalData : null;

        if(cursor == null) {
          break;
        }

        if(count++ >= 200) {  // each request will return at most 50 elements
          console.warn("Aborting link fetch after 10000 elements. Consider moving links into subcollections.");
          break;
        }
      }

      return {success: true, data: allLinks};
    } catch (error) {
      console.error('Error fetching links: ', error);
      return {success: false, data: errorToMessage(error)};
    }
  }

  /** Single-segment POST — does not interpret `/` in the name. */
  async _createFolderSegment(
    name: string,
    parentId: number,
  ): Promise<ApiReturnType<unknown>> {
    try {
      const request: CreateFolderRequest = { name: name, parentId: +parentId };
      const response = await fetch(`${this.host}/api/v1/collections`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if (response.status !== 200) {
        throw 'Could not create folder: ' + data.response;
      }
      return { success: true, data: data.response };
    } catch (error) {
      console.error('Error creating collection: ', error);
      return { success: false, data: errorToMessage(error) };
    }
  }

  /**
   * Create a folder. Names containing `/` are a path relative to parentId:
   * each segment is find-or-created under the previous (e.g. "AI/analysis" under root
   * nests analysis inside an existing AI folder instead of a literal "AI/analysis").
   */
  async createFolder(
    name: string,
    parentId: number,
  ): Promise<ApiReturnType<unknown>> {
    const segments = name
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);

    if (segments.length === 0) {
      return { success: false, data: 'Folder name is empty' };
    }

    // Single segment: always create (historical behavior; no silent reuse).
    if (segments.length === 1) {
      return this._createFolderSegment(segments[0], parentId);
    }

    try {
      const foldersResult = await this.fetchFolders();
      if (!foldersResult.success) {
        return {
          success: false,
          data: typeof foldersResult.data === 'string' ? foldersResult.data : 'Failed to fetch folders',
        };
      }

      // Local working copy so each created segment is visible to later lookups without refetch.
      const folders: Folder[] = [...foldersResult.data];
      let currentParentId = +parentId || 0;
      let lastCreated: unknown = null;

      for (const segment of segments) {
        const existing = folders.find(
          (f) =>
            f.name.localeCompare(segment, undefined, { sensitivity: 'accent' }) === 0 &&
            (f.parentId ?? 0) === currentParentId,
        );
        if (existing) {
          currentParentId = existing.id;
          lastCreated = existing;
          continue;
        }

        const created = await this._createFolderSegment(segment, currentParentId);
        if (!created.success) {
          return created;
        }

        const createdId = readCreatedFolderId(created.data);
        if (createdId == null) {
          return { success: false, data: 'Created folder but could not read its id' };
        }

        folders.push({
          id: createdId,
          name: segment,
          ownerId: 0,
          parentId: currentParentId || undefined,
          createdAt: new Date().toISOString(),
          // Echo of what the server just stored: no colour is sent, so it applies its default,
          // which the popup then renders in the accent (see FolderItem).
          color: defaultFolderColor,
        });
        currentParentId = createdId;
        lastCreated = created.data;
      }

      return { success: true, data: lastCreated };
    } catch (error) {
      console.error('Error creating folder path: ', error);
      return { success: false, data: errorToMessage(error) };
    }
  }


  async updateFolder(
    id: number,
    name: string,
    parentId: number,
  ): Promise<ApiReturnType<any>> {
    try {
      const oldData = await this._fetchFolderData(id);
      if(!oldData.success) {
        throw 'Could not fetch old collection data: ' + oldData.data;
      }
      // fetch the old folder data first and only update the necessary fields
      // this avoids resetting fields that have been set in the Linkwarden Dashboard
      // also, for some reason this API endpoint needs all fields to be set, not only the updated ones
      const request: UpdateFolderRequest = {...oldData.data, id: +id, name: name, parentId: parentId == 0 ? 'root' : +parentId};
      const response = await fetch(`${this.host}/api/v1/collections/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        credentials: "omit",
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if(response.status !== 200) {
        throw 'Could not update collection: ' + data.response;
      }
      return { success: true, data: data.response };
    } catch (error) {
      console.error('Error creating collection: ', error);
      return { success: false, data: errorToMessage(error) };
    }
  }

  async deleteFolder(collectionId: number): Promise<ApiReturnType<any>> {
    try {
      const response = await fetch(`${this.host}/api/v1/collections/${collectionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        credentials: "omit",
      });
      const data = await response.json();
      if(response.status !== 200) {
        throw 'Could not delete folder: ' + data.response;
      }
      return { success: true, data: data.response };
    } catch (error) {
      console.error('Error deleting link: ', error);
      return { success: false, data: errorToMessage(error) };
    }
  }
}
