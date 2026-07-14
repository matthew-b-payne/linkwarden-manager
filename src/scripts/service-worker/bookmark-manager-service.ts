import { Folder, Link, LinksByFolder, NewLink, SaveSessionRequest, SaveSessionResult, Tag } from "../utils/interfaces";

export type ApiReturnType<T> =
    | { success: true; data: T; additionalData?: unknown }
    | { success: false; data: string; additionalData?: unknown };

export interface BookmarkManagerService {
    fetchAllLinksFromAllFolders(): Promise<ApiReturnType<LinksByFolder>>;
    fetchFolders(): Promise<ApiReturnType<Folder[]>>;
    fetchLinks(collectionId: number): Promise<ApiReturnType<Link[]>>;
    fetchTags(): Promise<ApiReturnType<Tag[]>>;
    saveLink(link: NewLink): Promise<ApiReturnType<unknown>>;
    saveSession(req: SaveSessionRequest): Promise<ApiReturnType<SaveSessionResult>>;
    updateLink(
        link: NewLink,
        collectionOwnerId: string
    ): Promise<ApiReturnType<unknown>>;
    deleteLink(linkId: number): Promise<ApiReturnType<unknown>>;
    createFolder(
        name: string,
        parentId: number
    ): Promise<ApiReturnType<unknown>>;
    updateFolder(
        id: number,
        name: string,
        parentId: number,
    ): Promise<ApiReturnType<unknown>>;
    deleteFolder(collectionId: number): Promise<ApiReturnType<unknown>>;
}
