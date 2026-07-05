import { LinkwardenService } from './linkwarden-service';
import { getBrowser, getStorageItems } from '../utils/utils';
import { ApiReturnType, BookmarkManagerService } from './bookmark-manager-service';

console.log('Background Service Worker Loaded');

// Load credentials fresh from storage for every request rather than caching them
// in module-level state. Under Manifest V3 the service worker is terminated when
// idle (even while the popup is open) and respawned on the next message, which
// would wipe cached credentials and cause requests to be silently dropped.
async function getCredentials(): Promise<{ host?: string; token?: string }> {
  const result = await getStorageItems(['host', 'token']);
  return { host: result.host, token: result.token };
}

async function handleApiAction(request: any): Promise<ApiReturnType<any>> {
  const { host, token } = await getCredentials();
  if (!host || !token) {
    console.warn('Tried to call Linkwarden API with invalid credentials');
    return { success: false, data: 'Extension is not configured. Please set your host and API token in the options.' };
  }

  const service: BookmarkManagerService = new LinkwardenService(host, token);
  switch (request.action) {
    case 'fetchAllLinksFromAllFolders':
      return service.fetchAllLinksFromAllFolders();
    case 'fetchFolders':
      return service.fetchFolders();
    case 'fetchLinks':
      return service.fetchLinks(request.collectionId);
    case 'fetchTags':
      return service.fetchTags();
    case 'saveLink':
      return service.saveLink(request.link);
    case 'saveSession':
      return service.saveSession(request.data);
    case 'updateLink':
      return service.updateLink(request.data, request.collectionOwnerId);
    case 'deleteLink':
      return service.deleteLink(request.id);
    case 'createFolder':
      return service.createFolder(request.name, request.parentId);
    case 'updateFolder':
      return service.updateFolder(request.id, request.name, request.parentId);
    case 'deleteFolder':
      return service.deleteFolder(request.id);
    default:
      return { success: false, data: 'Unknown action: ' + request.action };
  }
}

getBrowser().runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('Message received:', request);

  if (request.action === 'hasValidConfiguration') {
    getCredentials().then(({ host, token }) => sendResponse(!!host && !!token));
    return true;
  } else if (request.action === 'reload') {
    // credentials are now read on-demand, so there's nothing to refresh; ack for callers that await it
    sendResponse(true);
    return true;
  }

  // every remaining action hits the Linkwarden API and always sends a response
  // (success or a failure object) so callers never hang waiting on a dropped message
  handleApiAction(request).then(sendResponse);
  return true;
});

export {};
