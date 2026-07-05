import { Folder, Link, NewLink, SaveSessionRequest, SaveSessionResult, Tag } from "../utils/interfaces";

export interface ApiReturnType<T> {
    success: boolean;
    data: T;
    additionalData?: any;
}

export interface BookmarkManagerService {
    fetchAllLinksFromAllFolders(): Promise<ApiReturnType<{}>>;
    fetchFolders(): Promise<ApiReturnType<Folder[]>>;
    fetchLinks(collectionId: number): Promise<ApiReturnType<Link[]>>;
    fetchTags(): Promise<ApiReturnType<Tag[]>>;
    saveLink(link: NewLink): Promise<ApiReturnType<any>>;
    saveSession(req: SaveSessionRequest): Promise<ApiReturnType<SaveSessionResult>>;
    updateLink(
        link: NewLink,
        collectionOwnerId: string
    ): Promise<ApiReturnType<any>>;
    deleteLink(linkId: number): Promise<ApiReturnType<any>>;
    createFolder(
        name: string,
        parentId: number
    ): Promise<ApiReturnType<any>>;
    updateFolder(
        id: number,
        name: string,
        parentId: number,
    ): Promise<ApiReturnType<any>>;
    deleteFolder(collectionId: number): Promise<ApiReturnType<any>>;
}
