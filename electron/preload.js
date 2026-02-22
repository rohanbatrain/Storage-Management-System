const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getApiUrl: () => ipcRenderer.invoke('get-api-url'),
    getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),
    getSyncStatus: () => ipcRenderer.invoke('get-sync-status'),
    // Export / Import archive via native file dialogs
    saveArchive: (arrayBuffer) => ipcRenderer.invoke('save-archive', arrayBuffer),
    openArchive: () => ipcRenderer.invoke('open-archive'),
    onSyncStatusChanged: (callback) => {
        ipcRenderer.on('sync-status-changed', (_event, status) => callback(status));
    },
});

// Also expose env for compat if needed, but the invoke pattern is better to get the dynamic port
contextBridge.exposeInMainWorld('env', {
    // This will be populated asynchronously in the app, 
    // or we can try to fetch it synchronously if we send it in `webPreferences.additionalArguments` (harder)
    // We will stick to the async `getApiUrl` pattern in the frontend.
});
