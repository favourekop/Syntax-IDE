"use client";

import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { SettingsPanel, loadPreferences, type EditorPreferences } from "./settings-panel";
import {
  Braces, Files, Search, GitBranch, Play, Blocks, Cloud, Settings, Bug, Pause, StepForward, Square,
  FolderOpen, Plus, ChevronDown, ChevronRight, Terminal, PanelBottom,
  CircleHelp, Bell, Command, Monitor, Download, ShieldCheck
} from "lucide-react";

const starterFiles = [
  { name: "index.html", language: "html", value: "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n    <title>My Project</title>\n  </head>\n  <body>\n    <main id=\"app\">\n      <h1>Beyond the Code.</h1>\n      <p>Your next idea starts here.</p>\n    </main>\n    <script src=\"main.js\"></script>\n  </body>\n</html>" },
  { name: "main.js", language: "javascript", value: "const greeting = \"Beyond the Code.\";\n\nfunction startSyntax() {\n  console.log(greeting);\n}\n\nstartSyntax();" },
  { name: "styles.css", language: "css", value: ":root {\n  color-scheme: dark;\n  font-family: Inter, sans-serif;\n  background: #07110d;\n  color: #f4f7f5;\n}\n\nbody { margin: 0; padding: 3rem; }\nmain { max-width: 760px; margin: 10vh auto; }\nh1 { color: #43d18b; font-size: 3rem; }" }
];

export default function Home() {
  const [files, setFiles] = useState(starterFiles);
  const [active, setActive] = useState("main.js");
  const [panel, setPanel] = useState<"terminal" | "output" | "preview" | "debug">("terminal");
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [message, setMessage] = useState("Welcome to SYNTAX IDE. Your desktop workspace is ready.");
  const [projectPath, setProjectPath] = useState("No folder opened");
  const [terminalOutput, setTerminalOutput] = useState("SYNTAX IDE local terminal\nOpen a project folder, then enter a command below.\n");
  const [terminalCommand, setTerminalCommand] = useState("");
  const [running, setRunning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<EditorPreferences>(loadPreferences);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewStarting, setPreviewStarting] = useState(false);
  const [debugActive, setDebugActive] = useState(false);
  const [debugStatus, setDebugStatus] = useState("Debugger idle");
  const [debugLine, setDebugLine] = useState("1");
  const [debugFrames, setDebugFrames] = useState<Array<{callFrameId:string;functionName:string;url:string;lineNumber:number;scopes:Array<{name:string;type:string;objectId?:string}>}>>([]);
  const [debugVariables, setDebugVariables] = useState<Array<{name:string;value:string|number|boolean;type?:string}>>([]);
  const [debugOutput, setDebugOutput] = useState<string[]>([]);
  const current = files.find((file) => file.name === active) ?? files[0] ?? { name: "Welcome", language: "plaintext", value: "// Open a project folder or create a new file to begin." };

  useEffect(() => {
    const unsubscribe = window.syntaxDesktop?.onTerminalOutput((payload) => {
      setTerminalOutput((value) => (value + payload.text).slice(-24000));
      if (payload.stream === "system" && payload.text.includes("process exited")) setRunning(false);
    });
    return () => unsubscribe?.();
  }, []);

  async function startDebugSession() {
    if (projectPath === "No folder opened") { setMessage("Open a project folder before debugging."); return; }
    const defaultEntry = files.find(file => [".js", ".cjs", ".mjs"].some(ext => file.name.toLowerCase().endsWith(ext)))?.name ?? active;\n    const entry = window.prompt("Node.js entry file (project-relative path):", defaultEntry);
    if (!entry) return;
    setPanel("debug");
    setDebugStatus("Starting Node inspector…");
    const result = await window.syntaxDesktop?.startDebug(entry);
    if (result?.ok) { setDebugActive(true); setDebugStatus("Paused at startup. Set breakpoints, then Continue."); }
    else setDebugStatus(result?.error ?? "Could not start debugger.");
  }

  async function debugAction(action: "continue" | "pause" | "stepOver" | "stepInto" | "stepOut" | "stop") {
    const result = await window.syntaxDesktop?.debugAction(action);
    if (!result?.ok) setDebugStatus(result?.error ?? "Debugger command failed.");
    if (action === "stop" && result?.ok) { setDebugActive(false); setDebugFrames([]); setDebugVariables([]); setDebugStatus("Debugger stopped"); }
  }

  async function addBreakpoint() {
    const result = await window.syntaxDesktop?.setDebugBreakpoint(active, Number(debugLine), true);
    setDebugStatus(result?.ok ? "Breakpoint set: " + active + ":" + debugLine : result?.error ?? "Could not set breakpoint.");
  }

  async function inspectScope(objectId?: string) {
    if (!objectId) return;
    const result = await window.syntaxDesktop?.debugProperties(objectId);
    if (result?.ok && result.properties) setDebugVariables(result.properties);
    else setDebugStatus(result?.error ?? "Could not inspect variables.");
  }

  useEffect(() => {
    const unsubscribe = window.syntaxDesktop?.onDebugEvent((event) => {
      const data = event as { type: string; text?: string; reason?: string; code?: number; frames?: Array<{callFrameId:string;functionName:string;url:string;lineNumber:number;scopes:Array<{name:string;type:string;objectId?:string}>}> };
      if (data.type === "started") { setDebugActive(true); setDebugStatus("Debug session running"); }
      if (data.type === "paused") { setDebugFrames(data.frames ?? []); setDebugStatus("Paused: " + (data.reason ?? "breakpoint")); }
      if (data.type === "resumed") { setDebugFrames([]); setDebugVariables([]); setDebugStatus("Running"); }
      if (data.type === "disconnected" || data.type === "exited") { setDebugActive(false); setDebugFrames([]); setDebugStatus(data.type === "exited" ? "Process exited (" + data.code + ")" : "Debugger disconnected"); }
      if (data.type === "output" || data.type === "console" || data.type === "exception") {
        const line = data.text ?? JSON.stringify(event);
        setDebugOutput(all => [...all, line].slice(-100));
      }
    });
    return () => unsubscribe?.();
  }, []);

  async function executeCommand(event?: React.FormEvent) {
    event?.preventDefault();
    const command = terminalCommand.trim();
    if (!command) return;
    setTerminalOutput((value) => value + `\n$ ${command}\n`);
    setTerminalCommand("");
    setRunning(true);
    const result = await window.syntaxDesktop?.runCommand(command);
    if (!result?.ok) { setTerminalOutput((value) => value + (result?.error ?? "Desktop runtime is unavailable.") + "\n"); setRunning(false); }
  }

  async function stopCommand() {
    const result = await window.syntaxDesktop?.stopCommand();
    if (!result?.ok) setTerminalOutput((value) => value + (result?.error ?? "Unable to stop process.") + "\n");
  }
  const previewDoc = useMemo(() => {
    const html = files.find((file) => file.name === "index.html")?.value ?? "<h1>Start building</h1>";
    const css = files.find((file) => file.name === "styles.css")?.value ?? "";
    const js = files.find((file) => file.name === "main.js")?.value ?? "";
    return html.replace("</head>", `<style>${css.replace(/<\/style/gi, "")}</style></head>`)
      .replace("</body>", `<script>${js.replace(/<\/script/gi, "")}</script></body>`);
  }, [files]);

  const updateCode = (value?: string) => setFiles((all) => all.map((file) => file.name === active ? { ...file, value: value ?? "" } : file));

  function createFile() {
    const requested = window.prompt("New file path (example: src/app.tsx)");
    if (!requested) return;
    const name = requested.trim().replaceAll("\\", "/");
    if (!name || name.startsWith("/") || name.split("/").some((part) => !part || part === "." || part === ".." || part.startsWith("."))) {
      setMessage("Use a project-relative file path without hidden or parent folders.");
      return;
    }
    if (files.some((file) => file.name === name)) {
      setMessage("A file with that path is already open.");
      return;
    }
    const extension = name.split(".").pop()?.toLowerCase() ?? "txt";
    const language = extension === "js" ? "javascript" : extension;
    setFiles((all) => [...all, { name, language, value: "" }]);
    setActive(name);
    setMessage(`Created ${name}. Save the project to write it to disk.`);
  }

  async function openFolder() {
    const result = await window.syntaxDesktop?.chooseProjectFolder();
    if (result?.path) {
      setProjectPath(result.path);
      const loaded = await window.syntaxDesktop?.readProjectFiles(result.path);
      if (loaded?.files) {
        setFiles(loaded.files);
        setActive(loaded.files[0]?.name ?? "");
        setMessage(loaded.files.length ? `Opened local project: ${result.path}` : "Folder opened. Create a file to start this project.");
      }
    }
  }

  async function saveWorkspace() {
    if (!projectPath || projectPath === "No folder opened") {
      setMessage("Open a project folder first. Your starter workspace is currently in memory.");
      return;
    }
    const result = await window.syntaxDesktop?.writeProjectFiles(projectPath, files);
    setMessage(result?.ok ? "Project files saved to your computer." : result?.error ?? "Could not save project files.");
  }

  async function runLocalPreview() {
    if (projectPath === "No folder opened") { setMessage("Open a project folder before starting localhost preview."); return; }
    setPanel("preview"); setPreviewStarting(true); setMessage("Starting local development server…");
    const result = await window.syntaxDesktop?.startPreview(preferences.previewCommand);
    setPreviewStarting(false);
    if (result?.ok && result.url) { setPreviewUrl(result.url); setMessage("Local preview ready at " + result.url); }
    else setMessage(result?.error ?? "Could not start local preview.");
  }

  async function stopLocalPreview() {
    const result = await window.syntaxDesktop?.stopPreview();
    if (result?.ok) { setPreviewUrl(""); setMessage("Local preview stopped."); }
    else setMessage(result?.error ?? "No local preview is running.");
  }

  useEffect(() => {
    const stopped = window.syntaxDesktop?.onPreviewStopped(() => setPreviewUrl(""));
    return () => stopped?.();
  }, []);

  useEffect(() => {
    if (!preferences.autosave || projectPath === "No folder opened") return;
    const timer = window.setTimeout(() => { void saveWorkspace(); }, 1200);
    return () => window.clearTimeout(timer);
  }, [files, preferences.autosave, projectPath]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const parts: string[] = [];
      if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
      if (event.altKey) parts.push("Alt");
      if (event.shiftKey) parts.push("Shift");
      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
      if (!["Control", "Alt", "Shift", "Meta"].includes(event.key)) parts.push(key);
      const pressed = parts.join("+");
      const action = Object.entries(preferences.keybindings).find(([, binding]) => binding === pressed)?.[0];
      if (!action) return;
      if (action === "openSettings") { event.preventDefault(); setSettingsOpen(true); }
      if (action === "save") { event.preventDefault(); void saveWorkspace(); }
      if (action === "startPreview") { event.preventDefault(); void runLocalPreview(); }
      if (action === "toggleTerminal") { event.preventDefault(); setPanel("terminal"); }
      if (action === "openFolder") { event.preventDefault(); void openFolder(); }
      if (action === "runCommand") { event.preventDefault(); void executeCommand(); }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [preferences, files, projectPath, terminalCommand]);

  return (
    <main className="desktop">
      <header className="titlebar">
        <div className="brand"><span className="brandMark"><Braces size={21}/></span><span>SYNTAX</span><small>BEYOND THE CODE.</small></div>
        <div className="menubar"><button>File</button><button>Edit</button><button>Selection</button><button>View</button><button>Run</button><button>Terminal</button><button>Help</button></div>
        <div className="titleActions"><span className="localPill"><span/> Local workspace</span><button title="Notifications"><Bell size={17}/></button><button title="Settings (Ctrl+,)" onClick={() => setSettingsOpen(true)}><Settings size={17}/></button></div>
      </header>

      <div className="workspace">
        <aside className="activitybar">
          <button className="selected" title="Explorer"><Files/></button><button title="Search"><Search/></button><button title="Source control"><GitBranch/></button><button title="Run and debug" onClick={() => setPanel("debug")}><Bug/></button><button title="Extensions"><Blocks/></button><div className="activitySpacer"/><button title="Cloud services"><Cloud/></button><button title="Settings" onClick={() => setSettingsOpen(true)}><Settings/></button>
        </aside>

        {explorerOpen && <aside className="explorer">
          <div className="sectionHeading">EXPLORER <button type="button" title="New file" aria-label="Create new file" onClick={createFile}><Plus size={16}/></button></div>
          <button className="projectHeading" onClick={() => setExplorerOpen(false)}><ChevronDown size={14}/><FolderOpen size={15}/><strong>{projectPath === "No folder opened" ? "SYNTAX WORKSPACE" : projectPath.split(/[\\/]/).pop()}</strong></button>
          <div className="fileList">{files.map((file) => <button key={file.name} title={file.name} style={{ paddingLeft: 12 + Math.max(0, file.name.split("/").length - 1) * 13 }} className={active === file.name ? "file active" : "file"} onClick={() => setActive(file.name)}><Braces size={15}/>{file.name.split("/").pop()}</button>)}</div>
          <button className="openFolder" onClick={openFolder}><FolderOpen size={15}/> Open project folder</button>
        </aside>}

        <section className="editorArea">
          <div className="tabs">{files.map((file) => <button key={file.name} className={active === file.name ? "tab activeTab" : "tab"} onClick={() => setActive(file.name)}><Braces size={15}/>{file.name}<span/></button>)}</div>
          <div className="editorMeta"><span>SYNTAX WORKSPACE</span><span>{current.name}</span><span>{current.language.toUpperCase()}</span><span className="metaSpacer"/><button onClick={saveWorkspace}>Save project</button></div>
          <div className="codeEditor"><Editor height="100%" theme={preferences.theme === "light" ? "vs" : preferences.theme === "high-contrast" ? "hc-black" : "vs-dark"} language={current.language} value={current.value} onChange={updateCode} options={{ minimap: { enabled: preferences.minimap }, wordWrap: preferences.wordWrap, fontSize: preferences.fontSize, fontFamily: "JetBrains Mono, Consolas, monospace", fontLigatures: true, padding: { top: 18 }, automaticLayout: true, scrollBeyondLastLine: false, smoothScrolling: true, cursorBlinking: "smooth" }}/></div>
          <div className="bottomPanel">
            <div className="panelTabs"><button className={panel === "terminal" ? "panelActive" : ""} onClick={() => setPanel("terminal")}><Terminal size={15}/> TERMINAL</button><button className={panel === "output" ? "panelActive" : ""} onClick={() => setPanel("output")}>OUTPUT</button><button className={panel === "debug" ? "panelActive" : ""} onClick={() => setPanel("debug")}><Bug size={14}/> DEBUG</button><button className={panel === "preview" ? "panelActive" : ""} onClick={() => setPanel("preview")}>LOCAL PREVIEW</button>{panel === "preview" && <><button onClick={runLocalPreview} disabled={previewStarting || !!previewUrl}>{previewStarting ? "STARTING…" : "START PREVIEW"}</button><button onClick={stopLocalPreview} disabled={!previewUrl}>STOP</button></>}<span/><button title="Hide panel"><PanelBottom size={16}/></button></div>
            {panel === "terminal" && <div className="terminalContent terminalLive"><pre aria-live="polite">{terminalOutput}</pre><form className="terminalCommand" onSubmit={executeCommand}><span>$</span><input aria-label="Terminal command" value={terminalCommand} onChange={(event) => setTerminalCommand(event.target.value)} placeholder={projectPath === "No folder opened" ? "Open a project folder to run commands" : "Enter a command, e.g. npm run dev"} disabled={projectPath === "No folder opened" || running}/><button type="submit" disabled={projectPath === "No folder opened" || running}>Run</button><button type="button" onClick={stopCommand} disabled={!running}>Stop</button></form></div>}
            {panel === "output" && <div className="terminalContent"><p>BUILD OUTPUT</p><p>{message}</p></div>}
            {panel === "debug" && <div className="debugPanel"><div className="debugToolbar"><strong>{debugStatus}</strong><button onClick={startDebugSession} disabled={debugActive}>Start Node debug</button><button onClick={() => debugAction("continue")} disabled={!debugActive}><Play size={13}/> Continue</button><button onClick={() => debugAction("pause")} disabled={!debugActive}><Pause size={13}/> Pause</button><button onClick={() => debugAction("stepOver")} disabled={!debugActive}><StepForward size={13}/> Step over</button><button onClick={() => debugAction("stepInto")} disabled={!debugActive}>Step into</button><button onClick={() => debugAction("stepOut")} disabled={!debugActive}>Step out</button><button onClick={() => debugAction("stop")} disabled={!debugActive}><Square size={13}/> Stop</button></div><div className="debugBreakpoint"><span>Breakpoint in active file</span><input aria-label="Breakpoint line" type="number" min="1" value={debugLine} onChange={e => setDebugLine(e.target.value)}/><button onClick={addBreakpoint} disabled={!debugActive}>Add breakpoint</button></div><div className="debugColumns"><section><h4>CALL STACK / SCOPES</h4>{debugFrames.length ? debugFrames.map(frame => <article key={frame.callFrameId}><strong>{frame.functionName}</strong><small>{frame.url.split("/").slice(-2).join("/")}:{frame.lineNumber + 1}</small>{frame.scopes.map(scope => <button key={scope.name} disabled={!scope.objectId} onClick={() => inspectScope(scope.objectId)}>{scope.name} · inspect</button>)}</article>) : <p>Start a Node.js debug session. Paused frames and scopes appear here.</p>}</section><section><h4>VARIABLES</h4>{debugVariables.map(item => <div className="debugVariable" key={item.name}><strong>{item.name}</strong><span>{String(item.value)}</span></div>)}</section></div><div className="debugConsole"><h4>DEBUG CONSOLE</h4>{debugOutput.map((line,index) => <p key={index}>{line}</p>)}</div></div>}
            {panel === "preview" && (previewUrl ? <iframe title="Private localhost project preview" src={previewUrl} className="previewFrame"/> : <div className="previewEmpty"><strong>Local development preview</strong><p>{message}</p><span>Start Preview runs your configured development command on this computer only.</span><button onClick={runLocalPreview} disabled={previewStarting || projectPath === "No folder opened"}>{previewStarting ? "Starting…" : "Start localhost preview"}</button></div>)}
          </div>
        </section>
      </div>

      <footer className="statusbar"><span><GitBranch size={13}/> desktop</span><span>JavaScript</span><span className="statusSpacer"/><span><ShieldCheck size={13}/> Local-first workspace</span><span>UTF-8</span><span>Windows desktop preview</span></footer>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} onChange={setPreferences}/> }
      <div className="welcomeOverlay" aria-hidden="true"><span><Command size={12}/> SYNTAX DESKTOP FOUNDATION</span><span><Monitor size={12}/> Windows 10 / 11 first</span><span><Download size={12}/> Installer pipeline in progress</span></div>
    </main>
  );
}
