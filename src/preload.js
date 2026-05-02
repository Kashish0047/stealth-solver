const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Overlay receives
  onAnswer:     (cb) => ipcRenderer.on('answer',      (_, data) => cb(data)),
  onStatus:     (cb) => ipcRenderer.on('status',      (_, data) => cb(data)),
  onClear:      (cb) => ipcRenderer.on('clear',       () => cb()),
  onPanic:      (cb) => ipcRenderer.on('panic',       (_, state) => cb(state)),
  onToggleText: (cb) => ipcRenderer.on('toggle-text', () => cb()),

  // Setup
  completeSetup: (config) => ipcRenderer.send('setup-complete', config),
  getConfig:     ()       => ipcRenderer.invoke('get-config'),
  saveConfig:    (config) => ipcRenderer.send('save-config', config),

  // Window controls
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
  hideWindow: () => ipcRenderer.send('hide-window'),
  quitApp:    () => ipcRenderer.send('quit-app')
});
