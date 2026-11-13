const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
const http = require("node:http");
const { attachRuntime } = require("./runtime.cjs");

const isDev = !app.isPackaged;
let mainWindow;
let nextServer;
let selectedProjectRoot = null;
const allowedExtensions = new Set([".html", ".htm", ".css", ".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".txt", ".svg", ".xml", ".yml", ".yaml", ".py", ".php", ".sql", ".sh", ".env.example"]);
const ignoredFolders = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo"]);

function waitForServer(url, timeout = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => { response.resume(); resolve(); });
      request.on("error", () => {
        if (Date.now() - started > timeout) return reject(new Error("SYNTAX desktop interface did not start in time."));
        setTimeout(check, 350);
      });
    };
    check();
  });
}

async function startPackagedNextServer() {
  const serverFile = path.join(process.resourcesPath, "app", "server.js");
  nextServer = spawn(process.execPath, [serverFile], {
    cwd: path.dirname(serverFile),
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PORT: "3210", HOSTNAME: "127.0.0.1" },
    stdio: "ignore",
    windowsHide: true
  });
  await waitForServer("http://127.0.0.1:3210");
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1050,
    minHeight: 680,
    backgroundColor: "#07110d",
    title: "SYNTAX IDE — Beyond the Code",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.loadURL(isDev ? "http://127.0.0.1:3000" : "http://127.0.0.1:3210");
}

ipcMain.handle("syntax:choose-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory", "createDirectory"] });
  selectedProjectRoot = result.canceled ? null : result.filePaths[0];
  return selectedProjectRoot ? { path: selectedProjectRoot } : null;
});

function isInsideProject(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function collectProjectFiles(root, directory = root, output = []) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredFolders.has(entry.name) || entry.name === ".DS_Store") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      await collectProjectFiles(root, fullPath, output);
      continue;
    }
    if (!entry.isFile() || !allowedExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const relativeName = path.relative(root, fullPath).split(path.sep).join("/");
    const stat = await fs.stat(fullPath);
    if (stat.size > 1024 * 1024) continue;
    output.push({
      name: relativeName,
      value: await fs.readFile(fullPath, "utf8"),
      language: path.extname(entry.name).toLowerCase().replace(".", "") === "js" ? "javascript" : path.extname(entry.name).toLowerCase().replace(".", "")
    });
    if (output.length >= 500) return output;
  }
  return output;
}

ipcMain.handle("syntax:read-project", async (_event, root) => {
  const safeRoot = selectedProjectRoot;
  if (!safeRoot || path.resolve(String(root || "")) !== path.resolve(safeRoot)) throw new Error("Choose a project folder before accessing files.");
  return { files: await collectProjectFiles(safeRoot) };
});

ipcMain.handle("syntax:write-project", async (_event, root, files) => {
  const safeRoot = selectedProjectRoot;
  if (!safeRoot || path.resolve(String(root || "")) !== path.resolve(safeRoot)) throw new Error("Choose a project folder before accessing files.");
  for (const file of Array.isArray(files) ? files : []) {
    const name = String(file.name || "").replaceAll("\\", "/");
    if (!name || name.startsWith("/") || name.split("/").some(part => !part || part === "." || part === ".." || part.startsWith("."))) continue;
    const extension = path.extname(name).toLowerCase();
    if (!allowedExtensions.has(extension)) continue;
    const destination = path.resolve(safeRoot, name);
    if (!isInsideProject(safeRoot, destination)) continue;
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, String(file.value ?? ""), "utf8");
  }
  return { ok: true };
});

attachRuntime(ipcMain, () => mainWindow, () => selectedProjectRoot);

app.whenReady().then(async () => {
  try {
    if (!isDev) await startPackagedNextServer();
    createWindow();
  } catch (error) {
    dialog.showErrorBox("SYNTAX IDE could not start", error.message);
    app.quit();
  }
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { if (nextServer) nextServer.kill(); });
