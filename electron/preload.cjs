const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("syntaxDesktop", {
  chooseProjectFolder: () => ipcRenderer.invoke("syntax:choose-folder"),
  readProjectFiles: (root) => ipcRenderer.invoke("syntax:read-project", root),
  writeProjectFiles: (root, files) => ipcRenderer.invoke("syntax:write-project", root, files)
});
