require('dotenv').config();
const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  desktopCapturer
} = require('electron');
const fs = require('fs');
const path = require('path');
const configManager = require('./configManager');
const solver = require('./solver');
const panicManager = require('./panicManager');

let overlayWindow = null;
let selectorWindow = null;
let setupWindow = null;

// ─── Window Factories ──────────────────────────────────────────────────────────

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  overlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setContentProtection(true);
  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay', 'index.html'));
  panicManager.register(overlayWindow);
  return overlayWindow;
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 580,
    height: 680,
    frame: false,
    transparent: true,
    resizable: false,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  setupWindow.loadFile(path.join(__dirname, 'renderer', 'setup', 'setup.html'));
  return setupWindow;
}

// Selector functionality removed for stealth mode

// ─── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const config = configManager.load();

  if (!config.hasSetup) {
    createSetupWindow();
  } else {
    createOverlayWindow();
    registerHotkeys();
    console.log('\x1b[32m%s\x1b[0m', '⚡ Stealth Solver Active');
    const config = configManager.load();
    const hasEnv = !!(process.env.GEMINI_KEY || process.env.GROQ_KEY);
    if (hasEnv) {
      console.log('\x1b[35m%s\x1b[0m', '🔑 Keys loaded from .env');
    }
    console.log('\x1b[36m%s\x1b[0m', 'Hotkeys:');
    console.log(' - Ctrl+Shift+S: Capture & Solve');
    console.log(' - Ctrl+Shift+M: Toggle Mouse (for scroll/copy)');
    console.log(' - ` (Backtick): Panic Hide/Show');
    console.log(' - Ctrl+Shift+X: Exit');
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});

// ─── Hotkeys ──────────────────────────────────────────────────────────────────

function registerHotkeys() {
  // Capture + solve (Ctrl+Shift+S)
  globalShortcut.register('CommandOrControl+Shift+S', async () => {
    console.log('\x1b[33m%s\x1b[0m', '📸 Capturing screen...');
    overlayWindow.webContents.send('status', { type: 'loading', message: 'Solving...' });
    await captureAndSolve();
  });

  // Panic hide/show (backtick ` — fastest single key)
  // Hides the ENTIRE overlay window from screen share / prying eyes
  let panicState = false;
  globalShortcut.register('`', () => {
    panicState = !panicState;
    if (panicState) {
      if (overlayWindow && overlayWindow.isVisible()) {
        overlayWindow.webContents.send('panic', 'hide');
        // Small delay so the renderer can process, then hide the window
        setTimeout(() => { if (overlayWindow) overlayWindow.hide(); }, 80);
      }
    } else {
      if (overlayWindow) {
        overlayWindow.show();
        overlayWindow.webContents.send('panic', 'show');
      }
    }
  });

  // Toggle just the answer text visibility (Ctrl+Shift+H)
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (!overlayWindow) return;
    overlayWindow.webContents.send('toggle-text');
  });

  // Clear answer (Ctrl+Shift+C)
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (overlayWindow) overlayWindow.webContents.send('clear');
  });

  // Toggle Mouse Interaction (Ctrl+Shift+M)
  let ignoreMouse = true;
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    ignoreMouse = !ignoreMouse;
    if (overlayWindow) {
      overlayWindow.setIgnoreMouseEvents(ignoreMouse, { forward: true });
      overlayWindow.webContents.send('status', { 
        type: 'info', 
        message: ignoreMouse ? 'Mouse: OFF' : 'Mouse: ON' 
      });
      console.log(`[Main] Mouse Ignore: ${ignoreMouse}`);
    }
  });

  // SELF DESTRUCT / Finish Test (Ctrl+Shift+X)
  // Instantly quits the app and unregisters all keys
  globalShortcut.register('CommandOrControl+Shift+X', () => {
    app.quit();
  });
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// Setup complete
ipcMain.on('setup-complete', async (_, config) => {
  configManager.save(config);
  if (setupWindow) { setupWindow.close(); setupWindow = null; }
  createOverlayWindow();
  registerHotkeys();
});

// Get config
ipcMain.handle('get-config', () => configManager.load());

// Save config
ipcMain.on('save-config', (_, config) => configManager.save(config));

async function captureAndSolve() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: screen.getPrimaryDisplay().bounds
    });

    const source = sources[0];
    const base64 = source.thumbnail.toDataURL();

    if (overlayWindow) {
      overlayWindow.show();
      overlayWindow.setContentProtection(true);
      overlayWindow.webContents.send('status', { type: 'loading', message: 'Thinking...' });
    }

    const config = configManager.load();
    console.log('\x1b[33m%s\x1b[0m', '🧠 Thinking...');
    const result = await solver.solve(base64, config);
    console.log('\x1b[32m%s\x1b[0m', '✅ Result received!');

    // ── Route based on question category ──────────────────────────────────────
    if (result.type === 'web') {
      // MERN / Web project → create folder on Desktop with all files
      if (result.files && result.files.length > 0) {
        const desktopPath = app.getPath('desktop');
        const rawName = result.questionName || `WebProject_${Date.now()}`;
        const folderName = rawName.replace(/[\\/:*?"<>|]/g, '_').trim() || `WebProject_${Date.now()}`;
        const folderPath = path.join(desktopPath, folderName);

        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }

        for (const file of result.files) {
          if (file.name && file.content) {
            const safeName = file.name.replace(/[\\/:*?"<>|]/g, '_');
            // Support nested paths like "src/App.jsx"
            const fullPath = path.join(folderPath, safeName);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, file.content, 'utf8');
          }
        }
      }
    }
    // DSA / MCQ / mixed → show on overlay screen (no folder needed)

    if (overlayWindow) {
      overlayWindow.webContents.send('answer', result);
    }
  } catch (err) {
    if (overlayWindow) {
      console.error('\x1b[31m%s\x1b[0m', `❌ Error: ${err.message}`);
      overlayWindow.show();
      overlayWindow.setContentProtection(true);
      overlayWindow.webContents.send('status', { type: 'error', message: err.message });
    }
  }
}

// Window controls from renderer
ipcMain.on('set-ignore-mouse', (event, ignore) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.setIgnoreMouseEvents(ignore, { forward: true });
});
ipcMain.on('hide-window', () => { if (overlayWindow) overlayWindow.hide(); });
ipcMain.on('quit-app', () => app.quit());
