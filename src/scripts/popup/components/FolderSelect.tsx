import React from 'react';
import Select, { SingleValue } from 'react-select';
import CreatableSelect from 'react-select/creatable';

interface FolderOption {
  value: number;
  label: string;
}

interface Props {
  folders: Array<{ id: number; name: string }>;
  value: number;
  onChange: (folderId: number) => void;
  onCreateFolder?: (name: string) => void;
  id?: string;
  label?: string;
  rootLabel?: string;
  // AddFolderModal's "Parent Folder" needs a selectable "no parent" (root) entry; AddLinkModal's
  // "Folder" picker doesn't — every link must live in a real, already-existing collection.
  includeRootOption?: boolean;
  // Surfaces the currently-selected folder as the first entry instead of wherever it falls
  // alphabetically — e.g. editing a link should show its current folder first, not buried in
  // the list, since that's the one you're most likely to keep or want to see at a glance.
  pinCurrentToTop?: boolean;
  allowCreate?: boolean;
  isDisabled?: boolean;
}

// Searchable single-select for picking a folder, e.g. by typing part of its name, instead of
// scrolling a plain <select> — matters once someone has more than a handful of collections.
// When allowCreate is true, typing a name that doesn't exist shows "Create \"name\"" and calls
// onCreateFolder, so a link can be saved to a brand-new collection without opening a second modal.
export const FolderSelect = ({
  folders,
  value,
  onChange,
  onCreateFolder,
  id = 'parentId',
  label = 'Parent Folder',
  rootLabel = '— No parent (root) —',
  includeRootOption = true,
  pinCurrentToTop = false,
  allowCreate = false,
  isDisabled = false,
}: Props) => {
  const folderOptions = folders.map((folder) => ({ value: folder.id, label: folder.name }));
  if (pinCurrentToTop) {
    const currentIndex = folderOptions.findIndex((option) => option.value === value);
    if (currentIndex > 0) {
      const [current] = folderOptions.splice(currentIndex, 1);
      folderOptions.unshift(current);
    }
  }
  const options: FolderOption[] = includeRootOption
    ? [{ value: 0, label: rootLabel }, ...folderOptions]
    : folderOptions;
  const selected = options.find((option) => option.value === value) ?? options[0];

  const commonProps = {
    inputId: id,
    name: id,
    options,
    value: selected,
    maxMenuHeight: 120,
    isDisabled,
    onChange: (option: SingleValue<FolderOption>) => onChange(option ? option.value : 0),
    className: "custom-react-select-container",
    classNamePrefix: "custom-react-select",
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {allowCreate && onCreateFolder ? (
        <CreatableSelect
          {...commonProps}
          formatCreateLabel={(inputValue: string) => `Create "${inputValue}"`}
          onCreateOption={onCreateFolder}
          isValidNewOption={(inputValue) => inputValue.trim().length > 0}
        />
      ) : (
        <Select {...commonProps} />
      )}
    </div>
  );
};
