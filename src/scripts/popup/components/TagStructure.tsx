import React, { useMemo, useState } from 'react';
import { ChevronLeft, Link2, Search, Tag as TagIcon, X } from 'lucide-react';
import { Link, NewLink, Tag } from '@/scripts/utils/interfaces';
import { SearchResults } from './SearchResults';

interface Props {
  tags: Tag[];
  allLinks: Link[];
  selectedTagId: number | null;
  onSelectTag: (tagId: number | null) => void;
  linksForTag: Link[];
  loadLinksForFolder: (id: number) => void;
  sortLinks: string;
  showEditLinkModal: (link: NewLink) => void;
  canShowOverlayButtons: boolean;
  openLinksInNewTab: boolean;
}

interface TagStats {
  count: number;
  latestAt: number | null;
}

const formatTagDate = (ms: number) => {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/** Split on commas/whitespace; empty tokens dropped. */
const parseFilterTerms = (raw: string): string[] =>
  raw
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

export const TagStructure = ({
  tags,
  allLinks,
  selectedTagId,
  onSelectTag,
  linksForTag,
  loadLinksForFolder,
  sortLinks,
  showEditLinkModal,
  canShowOverlayButtons,
  openLinksInNewTab,
}: Props) => {
  const [tagFilter, setTagFilter] = useState('');

  // One O(n) pass over the already-cached link set — same data search uses.
  // Cheap even for thousands of links; no extra API calls.
  const statsByTagId = useMemo(() => {
    const stats = new Map<number, TagStats>();
    allLinks.forEach((link) => {
      const created = Date.parse(link.createdAt);
      const createdMs = Number.isFinite(created) ? created : null;
      (link.tags || []).forEach((tag) => {
        if (!tag.id) return;
        const prev = stats.get(tag.id);
        if (!prev) {
          stats.set(tag.id, { count: 1, latestAt: createdMs });
          return;
        }
        prev.count += 1;
        if (createdMs != null && (prev.latestAt == null || createdMs > prev.latestAt)) {
          prev.latestAt = createdMs;
        }
      });
    });
    return stats;
  }, [allLinks]);

  const filterTerms = useMemo(() => parseFilterTerms(tagFilter), [tagFilter]);

  const filteredTags = useMemo(() => {
    const sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name));
    if (filterTerms.length === 0) {
      return sorted;
    }
    // OR: tag name contains any term (supports "dev api" or "dev, api")
    return sorted.filter((tag) => {
      const name = tag.name.toLowerCase();
      return filterTerms.some((term) => name.includes(term));
    });
  }, [tags, filterTerms]);

  const selectedTag = selectedTagId != null
    ? tags.find((tag) => tag.id === selectedTagId) ?? null
    : null;

  if (selectedTag) {
    const selectedStats = statsByTagId.get(selectedTag.id);
    return (
      <div>
        <button
          type="button"
          onClick={() => onSelectTag(null)}
          className="mb-2 flex items-center gap-1 text-sm text-primary hover:text-primary-hover focus:outline-none"
        >
          <ChevronLeft size={16} />
          All tags
        </button>
        <div className="mb-2 flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 border border-border">
          <TagIcon size={16} className="text-primary shrink-0" />
          <span className="text-sm font-medium truncate flex-grow">{selectedTag.name}</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted shrink-0">
            <Link2 size={12} />
            {selectedStats?.count ?? linksForTag.length}
          </span>
        </div>
        {linksForTag.length === 0 ? (
          <p className="text-sm text-muted px-1 py-2">No links with this tag in the cache.</p>
        ) : (
          <SearchResults
            links={linksForTag}
            loadLinksForFolder={loadLinksForFolder}
            sortLinks={sortLinks}
            showEditLinkModal={showEditLinkModal}
            canShowOverlayButtons={canShowOverlayButtons}
            openLinksInNewTab={openLinksInNewTab}
          />
        )}
      </div>
    );
  }

  if (tags.length === 0) {
    return <p className="text-sm text-muted px-1 py-2">No tags yet.</p>;
  }

  return (
    <div>
      <div className="relative mb-2">
        <Search
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        />
        <input
          type="text"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="Filter tags…"
          aria-label="Filter tags"
          className="w-full pl-7 pr-7 py-1 rounded-md border border-border bg-surface text-base-content text-xs focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {tagFilter && (
          <button
            type="button"
            onClick={() => setTagFilter('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted hover:text-base-content focus:outline-none"
            title="Clear filter"
            aria-label="Clear tag filter"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {filteredTags.length === 0 ? (
        <p className="text-sm text-muted px-1 py-2">No tags match “{tagFilter.trim()}”.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredTags.map((tag) => {
            const stats = statsByTagId.get(tag.id);
            const count = stats?.count ?? 0;
            const latestLabel = stats?.latestAt != null ? formatTagDate(stats.latestAt) : null;

            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onSelectTag(tag.id)}
                className="flex flex-col gap-1.5 rounded-lg bg-surface border border-border p-2 text-left transition-colors duration-200 hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary min-w-0"
              >
                <span className="text-sm font-medium truncate w-full">{tag.name}</span>
                <span className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span className="truncate">{latestLabel ?? '—'}</span>
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <Link2 size={12} />
                    {count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
