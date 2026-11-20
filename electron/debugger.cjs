const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs/promises");
const http = require("node:http");
const WebSocket = require("ws");

let child = null;
let socket = null;
let rootPath = null;
let getWindowRef = null;
let nextId = 1;
const pending = new Map();
const breakpoints = new Map();

function emit(channel, payload) {
  const windowRef = getWindowRef?.();
  if (windowRef && !windowRef.isDestroyed()) windowRef.webContents.send(channel, payload);
}

function send(method, params = {}) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error("Debugger is not connected."));
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("Debugger command timed out: " + method)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

function getInspectorPort(output) {
  const match = output.match(/ws:\/\/127\.0\.0\.1:(\d+)\//);
  return match ? Number(match[1]) : null;
}

function readInspectorList(port) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: "127.0.0.1", port, path: "/json/list", timeout: 1500 }, response => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", chunk => body += chunk);
      response.on("end", () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on("error", reject);
    request.on("timeout", () => { request.destroy(); reject(new Error("Inspector endpoint timed out.")); });
  });
}

async function waitForInspector(port, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const list = await readInspectorList(port);
      const target = list.find(item => item.webSocketDebuggerUrl);
      if (target) return target.webSocketDebuggerUrl;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error("Node inspector did not become ready.");
}

async function connectInspector(url) {
  socket = new WebSocket(url, { handshakeTimeout: 5000, maxPayload: 10 * 1024 * 1024 });
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  socket.on("message", raw => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id);
      clearTimeout(item.timer);
      pending.delete(message.id);
      if (message.error) item.reject(new Error(message.error.message || "Debugger command failed."));
      else item.resolve(message.result || {});
      return;
    }
    if (message.method === "Debugger.paused") {
      const frames = (message.params.callFrames || []).map(frame => ({
        callFrameId: frame.callFrameId,
        functionName: frame.functionName || "(anonymous)",
        url: frame.url,
        lineNumber: frame.location?.lineNumber ?? 0,
        columnNumber: frame.location?.columnNumber ?? 0,
        scopes: (frame.scopeChain || []).map(scope => ({
          type: scope.type,
          name: scope.name || scope.type,
          objectId: scope.object?.objectId
        }))
      }));
      emit("syntax:debug-event", { type: "paused", reason: message.params.reason, frames });
    } else if (message.method === "Debugger.resumed") {
      emit("syntax:debug-event", { type: "resumed" });
    } else if (message.method === "Runtime.consoleAPICalled") {
      const args = (message.params.args || []).map(arg => arg.value ?? arg.description ?? arg.type);
      emit("syntax:debug-event", { type: "console", level: message.params.type, text: args.join(" ") });
    } else if (message.method === "Runtime.exceptionThrown") {
      emit("syntax:debug-event", { type: "exception", details: message.params.exceptionDetails });
    } else if (message.method === "Debugger.scriptParsed") {
      emit("syntax:debug-event", { type: "script", url: message.params.url });
    }
  });
  socket.on("close", () => {
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error("Debugger connection closed.")); }
    pending.clear();
    emit("syntax:debug-event", { type: "disconnected" });
    socket = null;
  });
  await send("Runtime.enable");
  await send("Debugger.enable");
}

function inside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function attachDebugger(ipcMain, getWindow, getProjectRoot) {
  getWindowRef = getWindow;
  ipcMain.handle("syntax:debug-start", async (_event, entry) => {
    if (child) return { ok: false, error: "A debug session is already active." };
    rootPath = getProjectRoot();
    if (!rootPath) return { ok: false, error: "Open a project folder first." };
    const target = path.resolve(rootPath, String(entry || ""));
    if (!inside(rootPath, target) || target === path.resolve(rootPath)) return { ok: false, error: "Choose an entry file inside the active project." };
    const stat = await fs.stat(target).catch(() => null);
    if (!stat?.isFile()) return { ok: false, error: "The selected entry file does not exist." };
    if (![".js", ".cjs", ".mjs"].includes(path.extname(target).toLowerCase())) return { ok: false, error: "The first debugger target supports JavaScript entry files (.js, .cjs, .mjs). TypeScript and browser debugging will be added as separate runtime targets." };
    child = spawn(process.env.SYNTAX_NODE_PATH || "node", ["--inspect-brk=127.0.0.1:0", target], {
      cwd: rootPath,
      env: { ...process.env, FORCE_COLOR: "0" },
      windowsHide: true,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    const collect = chunk => {
      const text = chunk.toString();
      output = (output + text).slice(-12000);
      emit("syntax:debug-event", { type: "output", text });
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("exit", code => {
      emit("syntax:debug-event", { type: "exited", code });
      child = null;
      rootPath = null;
      breakpoints.clear();
      if (socket) socket.close();
    });
    try {
      const start = Date.now();
      let port = null;
      while (!port && Date.now() - start < 12000 && child) {
        port = getInspectorPort(output);
        if (!port) await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!port) throw new Error("Node did not publish its loopback inspector endpoint. Check that Node.js is installed.");
      const url = await waitForInspector(port);
      await connectInspector(url);
      emit("syntax:debug-event", { type: "started", entry: path.relative(rootPath, target).split(path.sep).join("/") });
      return { ok: true };
    } catch (error) {
      if (child) child.kill();
      child = null;
      if (socket) socket.close();
      socket = null;
      return { ok: false, error: error.message };
    }
  });

  ipcMain.handle("syntax:debug-breakpoint", async (_event, file, line, enabled = true) => {
    if (!rootPath || !socket) return { ok: false, error: "Start a debug session first." };
    const target = path.resolve(rootPath, String(file || ""));
    if (!inside(rootPath, target) || target === rootPath) return { ok: false, error: "Breakpoint path is outside the active project." };
    const lineNumber = Number(line);
    if (!Number.isInteger(lineNumber) || lineNumber < 1) return { ok: false, error: "Breakpoint line must be a positive integer." };
    const key = target + ":" + lineNumber;
    if (!enabled) {
      const id = breakpoints.get(key);
      if (id) await send("Debugger.removeBreakpoint", { breakpointId: id });
      breakpoints.delete(key);
      return { ok: true, enabled: false };
    }
    const result = await send("Debugger.setBreakpointByUrl", {
      url: require("node:url").pathToFileURL(target).href,
      lineNumber: lineNumber - 1
    });
    breakpoints.set(key, result.breakpointId);
    return { ok: true, breakpointId: result.breakpointId, locations: result.locations || [] };
  });

  ipcMain.handle("syntax:debug-action", async (_event, action) => {
    const methods = {
      continue: "Debugger.resume",
      pause: "Debugger.pause",
      stepOver: "Debugger.stepOver",
      stepInto: "Debugger.stepInto",
      stepOut: "Debugger.stepOut"
    };
    if (action === "stop") {
      if (child) child.kill();
      child = null;
      if (socket) socket.close();
      socket = null;
      rootPath = null;
      breakpoints.clear();
      return { ok: true };
    }
    const method = methods[String(action)];
    if (!method) return { ok: false, error: "Unsupported debugger action." };
    try { await send(method); return { ok: true }; }
    catch (error) { return { ok: false, error: error.message }; }
  });

  ipcMain.handle("syntax:debug-evaluate", async (_event, expression, callFrameId) => {
    if (!socket) return { ok: false, error: "Start a debug session first." };
    const source = String(expression || "").trim();
    if (!source || source.length > 1000) return { ok: false, error: "Enter an expression up to 1,000 characters." };
    try {
      const result = callFrameId
        ? await send("Debugger.evaluateOnCallFrame", { callFrameId: String(callFrameId), expression: source, returnByValue: true, generatePreview: true, silent: false })
        : await send("Runtime.evaluate", { expression: source, returnByValue: true, generatePreview: true, silent: false });
      if (result.exceptionDetails) return { ok: false, error: result.exceptionDetails.text || result.exceptionDetails.exception?.description || "Expression evaluation failed." };
      const remote = result.result || {};
      return { ok: true, value: remote.value ?? remote.description ?? remote.type ?? "undefined" };
    } catch (error) { return { ok: false, error: error.message }; }
  });

  ipcMain.handle("syntax:debug-properties", async (_event, objectId) => {
    if (!socket || typeof objectId !== "string" || objectId.length > 500) return { ok: false, error: "Invalid or inactive debugger object." };
    try {
      const result = await send("Runtime.getProperties", { objectId, ownProperties: true, accessorPropertiesOnly: false, generatePreview: true });
      return { ok: true, properties: (result.result || []).map(item => ({
        name: item.name,
        value: item.value?.value ?? item.value?.description ?? item.value?.type ?? "accessor",
        type: item.value?.type,
        objectId: item.value?.objectId
      })) };
    } catch (error) { return { ok: false, error: error.message }; }
  });

  return () => {
    if (child) child.kill();
    child = null;
    if (socket) socket.close();
    socket = null;
  };
}

module.exports = { attachDebugger };
