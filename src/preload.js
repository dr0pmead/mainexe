const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveUserData: async (data) => ipcRenderer.invoke('save-user-data', data),
    loadUserData: async (callback) => {
        const data = await ipcRenderer.invoke('load-user-data');
        callback(data);
    },
    getDepartments: () => ipcRenderer.invoke('get-departments'),
});