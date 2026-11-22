import { app, BrowserWindow, Menu, screen, session, type MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Window constants (FR-15, OQ-12, OQ-20, OQ-26).
const APP_TITLE = '4x-speed-mp4-player';
const MIN_SIZE = 420;

const here = path.dirname(fileURLToPath(import.meta.url));
const isMac = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;

/**
 * Default size: half of the work area (taskbar and dock excluded) of the display
 * under the cursor at launch, but never smaller than the minimum (OQ-20, OQ-36).
 */
function defaultWindowSize(): { width: number; height: number } {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { width, height } = display.workArea;
  return {
    width: Math.max(MIN_SIZE, Math.round(width / 2)),
    height: Math.max(MIN_SIZE, Math.round(height / 2)),
  };
}

function createWindow(): void {
  const size = defaultWindowSize();
  const win = new BrowserWindow({
    width: size.width,
    height: size.height,
    minWidth: MIN_SIZE,
    minHeight: MIN_SIZE,
    title: APP_TITLE,
    show: true,
    webPreferences: {
      // Electron's safe defaults (NFR-08): no Node.js in the page, isolated context, sandbox.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });
  mainWindow = win;

  // The page must not change the window title (FR-15).
  win.on('page-title-updated', (event) => event.preventDefault());

  // Dropped files or links must never navigate the window away (NFR-08, AT-21).
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());

  win.on('closed', () => {
    mainWindow = null;
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(path.join(here, '..', 'dist', 'index.html'));
  }
}

/** The OS-standard items only: no reload and no developer tools (OQ-28). */
function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = isMac
    ? [{ role: 'appMenu' }]
    : [{ label: 'File', submenu: [{ role: 'quit' }] }];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// One window only; a second launch focuses the existing one (OQ-26, AT-12).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    // Deny every permission request (camera, microphone, notifications, ...).
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);

    buildMenu();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });
}
