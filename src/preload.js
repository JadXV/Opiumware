const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    saveFileDialog: (defaultPath) => ipcRenderer.invoke('save-file-dialog', defaultPath),
    getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
    openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    createFile: (filePath) => ipcRenderer.invoke('create-file', filePath),
    createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),
    deleteItem: (itemPath) => ipcRenderer.invoke('delete-item', itemPath),
    renameItem: (oldPath, newPath) => ipcRenderer.invoke('rename-item', oldPath, newPath),
    readDirectory: (folderPath) => ipcRenderer.invoke('read-directory', folderPath),
    getOpiumwareScriptsPath: () => ipcRenderer.invoke('get-opiumware-scripts-path'),
    moveFile: (oldPath, newPath) => ipcRenderer.invoke('move-file', oldPath, newPath),

    openRoblox: () => ipcRenderer.invoke('open-roblox'),
    openScriptsFolder: () => ipcRenderer.invoke('open-scripts-folder'),
    openOpiumwareFolder: () => ipcRenderer.invoke('open-opiumware-folder'),
    executeScript: (content) => ipcRenderer.invoke('execute-script', content),
    startLogMonitoring: () => ipcRenderer.invoke('start-log-monitoring'),
    stopLogMonitoring: () => ipcRenderer.invoke('stop-log-monitoring'),

    toggleAutoexec: (filePath, fileName) => ipcRenderer.invoke('toggle-autoexec', filePath, fileName),
    isAutoexecEnabled: (fileName) => ipcRenderer.invoke('is-autoexec-enabled', fileName),
    getAutoexecScripts: () => ipcRenderer.invoke('get-autoexec-scripts'),
    removeAutoexecScript: (fileName) => ipcRenderer.invoke('remove-autoexec-script', fileName),

    minimizeWindow: () => ipcRenderer.send('window-minimize'),
    maximizeWindow: () => ipcRenderer.send('window-maximize'),
    closeWindow: () => ipcRenderer.send('window-close'),

    onMenuNewFile: (callback) => ipcRenderer.on('menu-new-file', callback),
    onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
    onMenuSaveAs: (callback) => ipcRenderer.on('menu-save-as', callback),
    onMenuCloseTab: (callback) => ipcRenderer.on('menu-close-tab', callback),
    onMenuFind: (callback) => ipcRenderer.on('menu-find', callback),
    onMenuReplace: (callback) => ipcRenderer.on('menu-replace', callback),
    onMenuToggleSidebar: (callback) => ipcRenderer.on('menu-toggle-sidebar', callback),
    onMenuGoToFile: (callback) => ipcRenderer.on('menu-go-to-file', callback),
    onMenuGoToLine: (callback) => ipcRenderer.on('menu-go-to-line', callback),

    onFileOpened: (callback) => ipcRenderer.on('file-opened', (event, data) => callback(data)),
    onFolderOpened: (callback) => ipcRenderer.on('folder-opened', (event, data) => callback(data)),
    
    onConsoleOutput: (callback) => ipcRenderer.on('console-output', (event, data) => callback(data)),
    onConsoleBatch: (callback) => ipcRenderer.on('console-batch', (event, data) => callback(data)),

    onTrayExecuteScript: (callback) => ipcRenderer.on('tray-execute-script', (event, data) => callback(data)),
    refreshTrayMenu: () => ipcRenderer.invoke('refresh-tray-menu'),

    getVersion: () => ipcRenderer.invoke('get-version'),

    platform: process.platform,

    analyzeLuau: (code) => ipcRenderer.invoke('analyze-luau', code),

    checkPortStatus: () => ipcRenderer.invoke('check-port-status'),
    executeScriptOnPort: (content, port) => ipcRenderer.invoke('execute-script-on-port', content, port)
});
