const { spawn } = require("node:child_process");
const http = require("node:http");

let previewProcess = null;
let previewWindow = null;
let activeUrl = null;

function probePort(port) {
  return new Promise(resolve => {
    const request = http.get({ host: "127.0.0.1", port, path: "/", timeout: 700 }, response => {
      response.resume();
      resolve(response.statusCode < 500);
    });
    request.on("error", () => resolve(false));
    request.on("timeout", () => { request.destroy(); resolve(false); });
  });
}


function waitForPreview(child, timeout = 90000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const started = Date.now();
    const output = [];
    const collect = chunk => { output.push(chunk.toString()); if (output.length > 80) output.shift(); };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    const inspect = async () => {
      if (settled) return;
      const match = output.join("").match(/https?:\\/\\/(?:localhost|127\\.0\\.0\\.1):([0-9]{2,5})/i);
      if (match && await probePort(Number(match[1]))) {
        settled = true;
        resolve("http://127.0.0.1:" + match[1]);
        return;
      }
      if (Date.now() - started > timeout) {
        settled = true;
        reject(new Error("Preview server did not become ready. Check the command and terminal output."));
        return;
      }
      setTimeout(inspect, 800);
    };
    child.once("error", error => { if (!settled) { settled = true; reject(error); } });
    child.once("exit", code => { if (!settled) { settled = true; reject(new Error("Preview process exited before the server was ready (code " + code + ").")); } });
    setTimeout(inspect, 500);
  });
}

function attachPreview(ipcMain, getWindow, getProjectRoot) {
  ipcMain.handle("syntax:start-preview", async (_event, command) => {
    const root = getProjectRoot();
    if (!root) return { ok: false, error: "Open a project folder before starting a local preview." };
    if (previewProcess) return { ok: false, error: "A preview process is already running.", url: activeUrl };
    const input = String(command || "npm run dev -- --host 127.0.0.1").trim();
    if (!input || input.length > 2000) return { ok: false, error: "Enter a valid preview command." };
    const win = getWindow();
    const isWindows = process.platform === "win32";
    previewProcess = spawn(isWindows ? "cmd.exe" : "bash", isWindows ? ["/d", "/s", "/c", input] : ["-lc", input], {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0", HOST: "127.0.0.1", HOSTNAME: "127.0.0.1", BROWSER: "none" },
      windowsHide: true,
      shell: false
    });
    previewWindow = win;
    const send = (stream, chunk) => {
      if (win && !win.isDestroyed()) win.webContents.send("syntax:terminal-output", { stream, text: chunk.toString() });
    };
    previewProcess.stdout.on("data", chunk => send("stdout", chunk));
    previewProcess.stderr.on("data", chunk => send("stderr", chunk));
    previewProcess.once("close", code => {
      send("system", "\\n[preview process exited with code " + code + "]\\n");
      previewProcess = null;
      previewWindow = null;
      activeUrl = null;
      if (win && !win.isDestroyed()) win.webContents.send("syntax:preview-stopped");
    });
    try {
      activeUrl = await waitForPreview(previewProcess);
      return { ok: true, url: activeUrl };
    } catch (error) {
      if (previewProcess) previewProcess.kill();
      previewProcess = null;
      activeUrl = null;
      return { ok: false, error: error.message };
    }
  });
  ipcMain.handle("syntax:stop-preview", async () => {
    if (!previewProcess) return { ok: false, error: "No local preview is running." };
    previewProcess.kill();
    previewProcess = null;
    activeUrl = null;
    return { ok: true };
  });
}

module.exports = { attachPreview };
