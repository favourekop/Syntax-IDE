const { spawn } = require("node:child_process");
const path = require("node:path");

function terminateProcessTree(child) {
  if (!child || !child.pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
    killer.on("error", () => { try { child.kill(); } catch {} });
  } else {
    try { process.kill(-child.pid, "SIGTERM"); }
    catch { try { child.kill("SIGTERM"); } catch {} }
  }
}

let activeProcess = null;
let activeWindow = null;

function attachRuntime(ipcMain, getWindow, getProjectRoot) {
  ipcMain.handle("syntax:run-command", async (_event, command) => {
    const root = getProjectRoot();
    if (!root) return { ok: false, error: "Open a project folder before running commands." };
    if (activeProcess) return { ok: false, error: "A command is already running. Stop it before starting another." };
    const input = String(command || "").trim();
    if (!input || input.length > 2000) return { ok: false, error: "Enter a command (maximum 2,000 characters)." };
    const win = getWindow();
    const isWindows = process.platform === "win32";
    activeProcess = spawn(isWindows ? "cmd.exe" : "bash", isWindows ? ["/d", "/s", "/c", input] : ["-lc", input], {
      cwd: path.resolve(root),
      env: { ...process.env, FORCE_COLOR: "0" },
      windowsHide: true,
      shell: false,
      detached: !isWindows
    });
    activeWindow = win;
    const send = (stream, chunk) => {
      if (win && !win.isDestroyed()) win.webContents.send("syntax:terminal-output", { stream, text: chunk.toString() });
    };
    activeProcess.stdout.on("data", chunk => send("stdout", chunk));
    activeProcess.stderr.on("data", chunk => send("stderr", chunk));
    activeProcess.on("error", error => send("stderr", error.message + "\n"));
    activeProcess.on("close", code => {
      send("system", "\n[process exited with code " + code + "]\n");
      activeProcess = null;
      activeWindow = null;
    });
    return { ok: true };
  });
  ipcMain.handle("syntax:stop-command", async () => {
    if (!activeProcess) return { ok: false, error: "No running command." };
    terminateProcessTree(activeProcess);
    return { ok: true };
  });
}

module.exports = { attachRuntime };
