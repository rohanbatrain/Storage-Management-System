const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const net = require('net');

let mainWindow;
let backendProcess;
let backendPort = 8000; // Default port
let syncManager = null;

// Function to find a free port
function findFreePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(findFreePort(startPort + 1));
            } else {
                reject(err);
            }
        });
    });
}

// Function to get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // In production, load the built files
    // In development, load the vite dev server
    const isDev = !app.isPackaged;

    if (isDev) {
        // Wait for Vite to start? Or assume it's running.
        // For now, let's assume the user runs the dev server separately or via a concurrently script
        // But for better UX, we can try to connect to localhost:3000
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    }
}

async function startBackend() {
    backendPort = await findFreePort(8000);
    console.log(`Starting backend on port ${backendPort}`);

    let backendExecutable;
    if (app.isPackaged) {
        // Path to the bundled backend executable
        backendExecutable = path.join(process.resourcesPath, 'backend-dist', 'psms-server');
        // On Windows it would be 'main.exe'
        if (process.platform === 'win32') {
            backendExecutable += '.exe';
        }
        backendProcess = spawn(backendExecutable, [], {
            env: { ...process.env, PORT: backendPort.toString() },
        });
    } else {
        // In dev, we might spawn python directly if we want integration
        // Or we assume the user is running the backend separately.
        // Let's spawn it for better DevX if possible, but it depends on venv.
        // For simplicity in Dev, let's assume the user runs it manually or we use a collected version.
        // WE WILL SPAWN IT if we can find the venv.
        const venvPython = path.join(__dirname, '..', 'backend', 'venv', 'bin', 'python');
        const mainScript = path.join(__dirname, '..', 'backend', 'app', 'main.py');
        if (fs.existsSync(venvPython) && fs.existsSync(mainScript)) {
            backendProcess = spawn(venvPython, [mainScript], {
                env: { ...process.env, PORT: backendPort.toString() },
                cwd: path.join(__dirname, '..', 'backend')
            });
        } else {
            console.log('Backend venv or script not found, assuming manual start on 8000');
            return;
        }
    }

    if (backendProcess) {
        backendProcess.stdout.on('data', (data) => {
            console.log(`Backend: ${data}`);
        });
        backendProcess.stderr.on('data', (data) => {
            console.error(`Backend Error: ${data}`);
        });
        backendProcess.on('close', (code) => {
            console.log(`Backend process exited with code ${code}`);
        });
    }
}

app.whenReady().then(async () => {
    await startBackend();

    // Store port in a global or pass it via IPC
    ipcMain.handle('get-api-url', () => `http://127.0.0.1:${backendPort}`);
    ipcMain.handle('get-network-info', () => {
        return {
            ip: getLocalIP(),
            port: backendPort,
            url: `http://${getLocalIP()}:${backendPort}`
        };
    });

    // --- Export / Import archive via native file dialogs ---
    ipcMain.handle('save-archive', async (_event, arrayBuffer) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save PSMS Archive',
            defaultPath: `psms-archive-${new Date().toISOString().split('T')[0]}.zip`,
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
        });
        if (result.canceled || !result.filePath) return { canceled: true };
        fs.writeFileSync(result.filePath, Buffer.from(arrayBuffer));
        return { canceled: false, filePath: result.filePath };
    });

    ipcMain.handle('open-archive', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Open PSMS Archive',
            filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
            properties: ['openFile'],
        });
        if (result.canceled || result.filePaths.length === 0) return { canceled: true };
        const filePath = result.filePaths[0];
        const data = fs.readFileSync(filePath);
        return {
            canceled: false,
            filePath,
            fileName: path.basename(filePath),
            // Convert to ArrayBuffer for IPC transfer
            data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
        };
    });

    createWindow();

    // Start sync manager after backend is ready
    const { SyncManager } = require('./sync');
    syncManager = new SyncManager(backendPort);

    syncManager.on('status-change', (status) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sync-status-changed', status);
        }
    });

    // Wait a moment for backend to be fully ready, then start sync
    setTimeout(() => {
        syncManager.start();
        console.log('[Main] Sync manager started');
    }, 3000);

    ipcMain.handle('get-sync-status', () => {
        return syncManager ? syncManager.getStatus() : { status: 'standalone', peer: null, lastSync: null };
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    if (syncManager) {
        syncManager.stop();
    }
    if (backendProcess) {
        backendProcess.kill();
    }
});
