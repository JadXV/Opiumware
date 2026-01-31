const { app, BrowserWindow, ipcMain, dialog, Menu, shell, Tray, nativeImage, globalShortcut, net } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

function getAppVersion() {
    const packagePath = path.join(__dirname, 'package.json');
    try {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return pkg.version ? `v${pkg.version}` : 'v0.0.0';
    } catch (e) {
        console.error('Error reading version from package.json:', e);
    }
    return 'v0.0.0';
}

async function getLatestVersion() {
    return new Promise((resolve) => {
        try {
            const request = net.request({
                method: 'HEAD',
                url: 'https://github.com/JadXV/Opiumware/releases/latest',
                redirect: 'follow'
            });
            request.on('redirect', (statusCode, method, redirectUrl) => {
                if (redirectUrl.includes('/tag/')) {
                    resolve(redirectUrl.split('/tag/')[1]);
                }
            });
            request.on('response', (response) => {
                const finalUrl = response.headers.location || request.url;
                if (finalUrl && finalUrl.includes('/tag/')) {
                    resolve(finalUrl.split('/tag/')[1]);
                } else {
                    resolve(null);
                }
            });
            request.on('error', (e) => {
                console.error(`Error getting latest version: ${e.message}`);
                resolve(null);
            });
            request.end();
        } catch (e) {
            console.error(`Error getting latest version: ${e.message}`);
            resolve(null);
        }
    });
}

let mainWindow;
let tray = null;
let lastTrayMenu = null;

function setupTray() {
    tray = new Tray(nativeImage.createEmpty());
    tray.setTitle('✦ Opium');
    tray.setToolTip('Opiumware Direct');
    updateTrayMenu();
}

function updateTrayMenu() {
    const scriptsPath = getOpiumwareScriptsPath();
    let scripts = [];
    
    try {
        if (fs.existsSync(scriptsPath)) {
            scripts = fs.readdirSync(scriptsPath)
                .filter(file => file.endsWith('.lua') || file.endsWith('.luau') || file.endsWith('.txt'))
                .sort();
        }
    } catch (e) {
        console.error('Error reading scripts for tray:', e);
    }
    
    const template = [
        {
            label: 'Opiumware Direct',
            enabled: false
        },
        { type: 'separator' }
    ];
    
    if (scripts.length > 0) {
        scripts.forEach(scriptName => {
            template.push({
                label: scriptName,
                click: async () => {
                    try {
                        const scriptPath = path.join(scriptsPath, scriptName);
                        if (fs.existsSync(scriptPath)) {
                            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
                            if (mainWindow && !mainWindow.isDestroyed()) {
                                mainWindow.webContents.send('tray-execute-script', {
                                    name: scriptName,
                                    content: scriptContent
                                });
                            }
                        }
                    } catch (e) {
                        console.error(`Error executing script from tray: ${e.message}`);
                    }
                }
            });
        });
    } else {
        template.push({
            label: 'No scripts found',
            enabled: false
        });
    }
    
    template.push(
        { type: 'separator' },
        {
            label: 'Open Opiumware',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                    if (mainWindow.isMinimized()) {
                        mainWindow.restore();
                    }
                }
            }
        },
        {
            label: 'Open Scripts Folder',
            click: () => {
                shell.openPath(scriptsPath);
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    );
    
    const contextMenu = Menu.buildFromTemplate(template);
    tray.setContextMenu(contextMenu);
    lastTrayMenu = contextMenu;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 12, y: 12 },
        backgroundColor: '#1e1e2e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            devTools: !app.isPackaged,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'Opiumware',
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'File',
            submenu: [
                {
                    label: 'New File',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => mainWindow.webContents.send('menu-new-file')
                },
                {
                    label: 'Open File...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => openFile()
                },
                {
                    label: 'Open Folder...',
                    accelerator: 'CmdOrCtrl+Shift+O',
                    click: () => openFolder()
                },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow.webContents.send('menu-save')
                },
                {
                    label: 'Save As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => mainWindow.webContents.send('menu-save-as')
                },
                { type: 'separator' },
                {
                    label: 'Close Tab',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => mainWindow.webContents.send('menu-close-tab')
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
                { type: 'separator' },
                {
                    label: 'Find',
                    accelerator: 'CmdOrCtrl+F',
                    click: () => mainWindow.webContents.send('menu-find')
                },
                {
                    label: 'Replace',
                    accelerator: 'CmdOrCtrl+H',
                    click: () => mainWindow.webContents.send('menu-replace')
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                { type: 'separator' },
                {
                    label: 'Toggle Sidebar',
                    accelerator: 'CmdOrCtrl+B',
                    click: () => mainWindow.webContents.send('menu-toggle-sidebar')
                }
            ]
        },
        {
            label: 'Go',
            submenu: [
                {
                    label: 'Go to File...',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => mainWindow.webContents.send('menu-go-to-file')
                },
                {
                    label: 'Go to Line...',
                    accelerator: 'CmdOrCtrl+G',
                    click: () => mainWindow.webContents.send('menu-go-to-line')
                }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Learn More',
                    click: async () => {
                        await shell.openExternal('https://github.com');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

async function openFile() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'JavaScript', extensions: ['js', 'jsx', 'ts', 'tsx'] },
            { name: 'Rust', extensions: ['rs'] },
            { name: 'Python', extensions: ['py'] },
            { name: 'Web', extensions: ['html', 'css', 'json'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf-8');
        mainWindow.webContents.send('file-opened', { path: filePath, content });
    }
}

async function openFolder() {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        const tree = readDirectoryTree(folderPath);
        mainWindow.webContents.send('folder-opened', { path: folderPath, tree });
    }
}

function readDirectoryTree(dirPath, depth = 0) {
    if (depth > 5) return [];

    const items = [];
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
        if (entry.name.startsWith('.') && !entry.name.startsWith('.git')) continue;
        if (['node_modules', 'target', 'dist', 'build', '__pycache__'].includes(entry.name)) {
            items.push({
                name: entry.name,
                type: 'folder',
                path: path.join(dirPath, entry.name),
                children: []
            });
            continue;
        }

        if (entry.isDirectory()) {
            items.push({
                name: entry.name,
                type: 'folder',
                path: path.join(dirPath, entry.name),
                children: readDirectoryTree(path.join(dirPath, entry.name), depth + 1)
            });
        } else {
            items.push({
                name: entry.name,
                type: 'file',
                path: path.join(dirPath, entry.name)
            });
        }
    }

    return items;
}

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-directory', async (event, folderPath) => {
    try {
        const tree = readDirectoryTree(folderPath);
        return { success: true, tree };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-file-dialog', async (event, defaultPath) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultPath,
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!result.canceled) {
        return { success: true, path: result.filePath };
    }
    return { success: false };
});

ipcMain.handle('get-file-stats', async (event, filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return { success: true, stats: { size: stats.size, mtime: stats.mtime } };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        const tree = readDirectoryTree(folderPath);
        return { success: true, path: folderPath, tree };
    }
    return { success: false };
});

ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Lua Scripts', extensions: ['lua', 'luau'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, path: filePath, content };
    }
    return { success: false };
});

ipcMain.handle('create-file', async (event, filePath) => {
    try {
        fs.writeFileSync(filePath, '', 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-folder', async (event, folderPath) => {
    try {
        fs.mkdirSync(folderPath, { recursive: true });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-item', async (event, itemPath) => {
    try {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
            fs.rmdirSync(itemPath, { recursive: true });
        } else {
            fs.unlinkSync(itemPath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('rename-item', async (event, oldPath, newPath) => {
    try {
        fs.renameSync(oldPath, newPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

function getOpiumwareScriptsPath() {
    const homeDir = require('os').homedir();
    const scriptsPath = path.join(homeDir, 'OPIUMWARE', 'Scripts');
    if (!fs.existsSync(scriptsPath)) {
        fs.mkdirSync(scriptsPath, { recursive: true });
    }
    return scriptsPath;
}

ipcMain.handle('get-opiumware-scripts-path', async () => {
    return { success: true, path: getOpiumwareScriptsPath() };
});

ipcMain.handle('open-roblox', async () => {
    try {
        const { spawn } = require('child_process');
        const robloxPaths = [
            '/Applications/Roblox.app/Contents/MacOS/RobloxPlayer',
            path.join(require('os').homedir(), 'Applications/Roblox.app/Contents/MacOS/RobloxPlayer')
        ];
        
        let robloxPath = null;
        for (const p of robloxPaths) {
            if (fs.existsSync(p)) {
                robloxPath = p;
                break;
            }
        }
        
        if (!robloxPath) {
            return { success: false, error: 'Roblox not found. Please install Roblox first.' };
        }
        
        spawn(robloxPath, [], { stdio: 'ignore', detached: true }).unref();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-scripts-folder', async () => {
    try {
        const scriptsPath = getOpiumwareScriptsPath();
        shell.openPath(scriptsPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-opiumware-folder', async () => {
    try {
        const homeDir = require('os').homedir();
        const opiumwarePath = path.join(homeDir, 'OPIUMWARE');
        if (!fs.existsSync(opiumwarePath)) {
            fs.mkdirSync(opiumwarePath, { recursive: true });
        }
        shell.openPath(opiumwarePath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

function getAutoexecPath() {
    const homeDir = require('os').homedir();
    const autoexecPath = path.join(homeDir, 'OPIUMWARE', 'autoexec');
    if (!fs.existsSync(autoexecPath)) {
        fs.mkdirSync(autoexecPath, { recursive: true });
    }
    return autoexecPath;
}

ipcMain.handle('toggle-autoexec', async (event, filePath, fileName) => {
    try {
        const autoexecPath = getAutoexecPath();
        const targetPath = path.join(autoexecPath, fileName);
        
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            return { success: true, enabled: false };
        } else {
            fs.copyFileSync(filePath, targetPath);
            return { success: true, enabled: true };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('is-autoexec-enabled', async (event, fileName) => {
    try {
        const autoexecPath = getAutoexecPath();
        const targetPath = path.join(autoexecPath, fileName);
        return { enabled: fs.existsSync(targetPath) };
    } catch (error) {
        return { enabled: false };
    }
});

ipcMain.handle('get-autoexec-scripts', async () => {
    try {
        const autoexecPath = getAutoexecPath();
        const files = fs.readdirSync(autoexecPath)
            .filter(f => f.endsWith('.lua') || f.endsWith('.luau') || f.endsWith('.txt'))
            .map(name => ({
                name,
                path: path.join(autoexecPath, name)
            }));
        return { success: true, scripts: files };
    } catch (error) {
        return { success: false, scripts: [], error: error.message };
    }
});

ipcMain.handle('remove-autoexec-script', async (event, fileName) => {
    try {
        const autoexecPath = getAutoexecPath();
        const targetPath = path.join(autoexecPath, fileName);
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

const OPIUM_START = 8392;
const OPIUM_END = 8397;

ipcMain.handle('check-port-status', async () => {
    const net = require('net');
    const portStatus = [];
    
    for (let port = OPIUM_START; port <= OPIUM_END; port++) {
        try {
            const client = new net.Socket();
            const isOnline = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    client.destroy();
                    resolve(false);
                }, 500);
                
                client.connect(port, '127.0.0.1', () => {
                    clearTimeout(timeout);
                    client.destroy();
                    resolve(true);
                });
                
                client.on('error', () => {
                    clearTimeout(timeout);
                    resolve(false);
                });
            });
            
            portStatus.push({
                port: port,
                online: isOnline,
                label: `Opiumware ${port}`
            });
        } catch (e) {
            portStatus.push({
                port: port,
                online: false,
                label: `Opiumware ${port}`
            });
        }
    }
    
    return portStatus;
});

ipcMain.handle('execute-script-on-port', async (event, scriptContent, targetPort) => {
    const net = require('net');
    const zlib = require('zlib');
    const port = parseInt(targetPort);
    
    try {
        const client = new net.Socket();
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                client.destroy();
                reject(new Error('Timeout'));
            }, 3000);
            
            client.connect(port, '127.0.0.1', () => {
                clearTimeout(timeout);
                const formattedScript = `OpiumwareScript ${scriptContent}`;
                const codeBytes = Buffer.from(formattedScript, 'utf8');
                const compressed = zlib.deflateSync(codeBytes);
                
                client.write(compressed);
                client.end();
                resolve();
            });
            
            client.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
        
        return {
            success: true,
            message: `Script executed successfully on port ${port}`
        };
    } catch (e) {
        return {
            success: false,
            message: `Failed to execute on port ${port}. Make sure Opiumware is running.`
        };
    }
});

ipcMain.handle('execute-script', async (event, scriptContent) => {
    const net = require('net');
    const zlib = require('zlib');
    
    for (let port = OPIUM_START; port <= OPIUM_END; port++) {
        try {
            const client = new net.Socket();
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    client.destroy();
                    reject(new Error('Timeout'));
                }, 3000);
                
                client.connect(port, '127.0.0.1', () => {
                    clearTimeout(timeout);
                    const formattedScript = `OpiumwareScript ${scriptContent}`;
                    const codeBytes = Buffer.from(formattedScript, 'utf8');
                    const compressed = zlib.deflateSync(codeBytes);
                    
                    client.write(compressed);
                    client.end();
                    resolve();
                });
                
                client.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
            
            return {
                success: true,
                message: `Script executed successfully via Opiumware on port ${port}`
            };
        } catch (e) {
            continue;
        }
    }
    
    return {
        success: false,
        message: 'No Opiumware instance detected. Make sure Roblox is running with Opiumware injected.'
    };
});

let logMonitorInterval = null;
let logRefreshRate = 0.5;

function sendToRenderer(channel, data) {
    if (mainWindow?.webContents && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

ipcMain.handle('start-log-monitoring', async () => {
    try {
        const os = require('os');
        const logDir = path.join(os.homedir(), 'Library/Logs/Roblox');
        
        if (!fs.existsSync(logDir)) {
            sendToRenderer('console-output', { message: 'Roblox logs directory not found', type: 'warning' });
            return { success: false, error: 'Roblox logs directory not found' };
        }

        if (logMonitorInterval) {
            clearInterval(logMonitorInterval);
        }

        sendToRenderer('console-output', { message: 'Starting log monitoring...', type: 'info' });
        
        let currentLogFile = null;
        let fileSize = 0;
        let lastFileCheck = 0;
        const fileCheckInterval = 5000;
        let logBuffer = [];
        let lastUpdateTime = Date.now();
        const updateInterval = 300;
        
        logMonitorInterval = setInterval(() => {
            try {
                const currentTime = Date.now();
                
                if (currentTime - lastFileCheck >= fileCheckInterval) {
                    try {
                        const files = fs.readdirSync(logDir)
                            .filter(f => {
                                const fullPath = path.join(logDir, f);
                                return fs.statSync(fullPath).isFile() && !f.startsWith('.');
                            });
                        
                        if (files.length > 0) {
                            files.sort((a, b) => {
                                const aPath = path.join(logDir, a);
                                const bPath = path.join(logDir, b);
                                return fs.statSync(bPath).mtime.getTime() - fs.statSync(aPath).mtime.getTime();
                            });
                            
                            const latestLogFile = path.join(logDir, files[0]);
                            
                            if (latestLogFile !== currentLogFile) {
                                currentLogFile = latestLogFile;
                                fileSize = fs.existsSync(currentLogFile) ? fs.statSync(currentLogFile).size : 0;
                                sendToRenderer('console-output', { 
                                    message: `Monitoring: ${path.basename(currentLogFile)}`, 
                                    type: 'info' 
                                });
                            }
                        }
                    } catch (e) {
                    }
                    lastFileCheck = currentTime;
                }
                
                if (currentLogFile && fs.existsSync(currentLogFile)) {
                    try {
                        const currentStats = fs.statSync(currentLogFile);
                        const currentSize = currentStats.size;
                        
                        if (currentSize > fileSize) {
                            const chunkSize = 1024 * 1024;
                            const readSize = currentSize - fileSize > chunkSize ? chunkSize : currentSize - fileSize;
                            
                            const buffer = Buffer.alloc(readSize);
                            const fd = fs.openSync(currentLogFile, 'r');
                            
                            try {
                                const bytesRead = fs.readSync(fd, buffer, 0, readSize, fileSize);
                                const newContent = buffer.subarray(0, bytesRead).toString('utf8');
                                
                                fileSize = fs.statSync(currentLogFile).size;
                                
                                const lines = newContent.split('\n');
                                for (const line of lines) {
                                    if (line.trim()) {
                                        let message = line;
                                        let type = 'output';
                                        
                                        if (line.includes('[FLog::Output]')) {
                                            type = 'output';
                                            message = line.replace(/.*\[FLog::Output\]\s*/, '');
                                        } else if (line.includes('[FLog::Warning]')) {
                                            type = 'warning';
                                            message = line.replace(/.*\[FLog::Warning\]\s*/, '');
                                        } else if (line.includes('[FLog::Error]')) {
                                            type = 'error';
                                            message = line.replace(/.*\[FLog::Error\]\s*/, '');
                                        } else if (line.includes('[DFLog::')) {
                                            continue;
                                        }
                                        
                                        message = message.replace(/^[\d\-:TZ,.]+\s+/, '').trim();
                                        
                                        if (message) {
                                            logBuffer.push({ message, type });
                                        }
                                    }
                                }
                            } finally {
                                fs.closeSync(fd);
                            }
                        }
                    } catch (e) {
                    }
                }
                
                if (logBuffer.length > 0 && (currentTime - lastUpdateTime >= updateInterval)) {
                    try {
                        const toSend = logBuffer.length > 100 ? logBuffer.slice(-100) : [...logBuffer];
                        logBuffer = [];
                        
                        if (toSend.length > 0) {
                            sendToRenderer('console-batch', toSend);
                        }
                        
                        lastUpdateTime = currentTime;
                    } catch (e) {
                        console.error('Error sending logs:', e);
                    }
                }
            } catch (e) {
                console.error('Log monitoring error:', e);
            }
        }, logRefreshRate * 1000);
        
        return { success: true, message: 'Log monitoring started' };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('stop-log-monitoring', async () => {
    if (logMonitorInterval) {
        clearInterval(logMonitorInterval);
        logMonitorInterval = null;
    }
    return { success: true };
});

ipcMain.handle('move-file', async (event, oldPath, newPath) => {
    try {
        const content = fs.readFileSync(oldPath);
        fs.writeFileSync(newPath, content);
        fs.unlinkSync(oldPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow.close());

app.whenReady().then(async () => {
    try {
        const latestVersion = await getLatestVersion();
        if (latestVersion === null) {
            console.log('Unable to check for updates - offline or connection error');
        } else if (latestVersion > getAppVersion()) {
            const choice = await dialog.showMessageBox({
                type: 'info',
                buttons: ['Update Now', 'Skip'],
                title: 'Update Available',
                message: `Carbon has an update available (${latestVersion}). Would you like to update?`,
                detail: 'Click "Update Now" to update automatically via the install script.'
            });

            if (choice.response === 0) {
                const updateProcess = spawn('bash', ['-c', 'curl -fsSL https://raw.githubusercontent.com/JadXV/Opiumware/refs/heads/main/install.sh | bash'], {
                    stdio: 'inherit',
                    detached: true
                });
                updateProcess.on('error', (err) => {
                    console.error('Failed to start update process:', err);
                });
                app.quit();
                return;
            }
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
    }

    createWindow();
    setupTray();
    
    globalShortcut.register('CommandOrControl+.', () => {
        if (tray && lastTrayMenu) {
            tray.popUpContextMenu(lastTrayMenu);
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

app.on('before-quit', () => {
    if (tray) {
        tray.destroy();
    }
    globalShortcut.unregisterAll();
});

ipcMain.handle('get-version', async () => {
    return { version: getAppVersion() };
});

ipcMain.handle('refresh-tray-menu', async () => {
    updateTrayMenu();
    return { success: true };
});

ipcMain.handle('analyze-luau', async (event, code) => {
    const tempDir = path.join(os.homedir(), 'OPIUMWARE', 'temp');
    const tempFile = path.join(tempDir, 'analysis.lua');
    const luauLspPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'LuauLSP')
        : path.join(__dirname, 'assets', 'LuauLSP');
    
    try {
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(tempFile, code, 'utf8');
        
        return new Promise((resolve) => {
            const process = spawn(luauLspPath, ['analyze', tempFile], {
                cwd: tempDir
            });
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            process.on('close', (code) => {
                try {
                    if (fs.existsSync(tempFile)) {
                        fs.unlinkSync(tempFile);
                    }
                } catch (e) {}
                
                resolve({
                    success: true,
                    output: stdout + stderr,
                    exitCode: code
                });
            });
            
            process.on('error', (err) => {
                resolve({
                    success: false,
                    error: err.message
                });
            });
        });
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});
