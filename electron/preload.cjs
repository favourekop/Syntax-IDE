const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("syntaxDesktop", {
  chooseProjectFolder: () => ipcRenderer.invoke("syntax:choose-folder"),
  readProjectFiles: (root) => ipcRenderer.invoke("syntax:read-project", root),
  writeProjectFiles: (root, files) => ipcRenderer.invoke("syntax:write-project", root, files),
  runCommand: (command) => ipcRenderer.invoke("syntax:run-command", command),
  startPreview: (command) => ipcRenderer.invoke("syntax:start-preview", command),
  stopPreview: () => ipcRenderer.invoke("syntax:stop-preview"),
  onPreviewStopped: (callback) => { const listener = () => callback(); ipcRenderer.on("syntax:preview-stopped", listener); return () => ipcRenderer.removeListener("syntax:preview-stopped", listener); },
  stopCommand: () => ipcRenderer.invoke("syntax:stop-command"),
  onTerminalOutput: (callback) => { const listener = (_event, payload) => callback(payload); ipcRenderer.on("syntax:terminal-output", listener); return () => ipcRenderer.removeListener("syntax:terminal-output", listener); }
});
