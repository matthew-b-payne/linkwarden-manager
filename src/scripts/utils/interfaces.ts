export interface Link {
    id: number;
    name: string;
    url: string;
    createdAt: string;
    tags: Tag[];
    folder: Folder;
}

export interface LinksByFolder {
    [key: string]: Link[];
}

export interface Tag {
    id: number;
    name: string;
}

export interface Folder {
    id: number;
    name: string;
    ownerId: number;
    parentId?: number;
    createdAt: string;
    icon?: string;
    iconWeight?: string;
    color: string;
}

export interface NewLink {
    id: number;
    url: string;
    title: string;
    collectionId: number;
    tags: string[];
}

export interface SessionTab {
    url: string;
    title: string;
}

export type SaveSessionDestination =
    | { type: 'new'; name: string; nestUnderSessions: boolean }
    | { type: 'existing'; collectionId: number };

export interface SaveSessionRequest {
    destination: SaveSessionDestination;
    tabs: SessionTab[];
    tags: string[];
}

export interface SaveSessionResult {
    collectionId: number;
    saved: number;
    failed: number;
    failedUrls: string[];
}
