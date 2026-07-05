import { Tag } from '@/scripts/utils/interfaces';
import React from 'react';
import CreatableSelect from 'react-select/creatable';

interface Props {
  allTags: Tag[];
  selected: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  id?: string;
}

export const TagSelect = ({
  allTags,
  selected,
  onChange,
  label = 'Tags',
  id = 'tagIds',
}: Props) => {
  const allTagOptions = allTags.map((tag) => ({ value: String(tag.id), label: tag.name }));
  // derive the selected options straight from the string array so newly-created tags
  // render as chips even before they exist in allTags
  const selectedOptions = selected.map((name) => ({ value: name, label: name }));

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1">
        {label}
      </label>
      <CreatableSelect
        isMulti
        name={id}
        id={id}
        options={allTagOptions}
        value={selectedOptions}
        maxMenuHeight={120}
        onChange={(values) => onChange(values.map((value) => value.label))}
        className="custom-react-select-container"
        classNamePrefix="custom-react-select"
      />
    </div>
  );
};
