"use client";

import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Braces, Files, Search, GitBranch, Play, Blocks, Cloud, Settings,
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
  const [panel, setPanel] = useState<"terminal" | "output" | "preview">("terminal");
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [message, setMessage] = useState("Welcome to SYNTAX IDE. Your desktop workspace is ready.");
  const [projectPath, setProjectPath] = useState("No folder opened");
  const [terminalOutput, setTerminalOutput] = useState("SYNTAX IDE local terminal\\nOpen a project folder, then enter a command below.\\n");
  const [terminalCommand, setTerminalCommand] = useState("");
  const [running, setRunning] = useState(false);
  const current = files.find((file) => file.name === active) ?? files[0];

  useEffect(() => {
    const unsubscribe = window.syntaxDesktop?.onTerminalOutput((payload) => {
      setTerminalOutput((value) => (value + payload.text).slice(-24000));
      if (payload.stream === "system" && payload.text.includes("process exited")) setRunning(false);
    });
    return () => unsubscribe?.();
  }, []);

  async function executeCommand(event?: React.FormEvent) {
    event?.preventDefault();
    const command = terminalCommand.trim();
    if (!command) return;
    setTerminalOutput((value) => value + `\\n$ ${command}\\n`);
    setTerminalCommand("");
    setRunning(true);
    const result = await window.syntaxDesktop?.runCommand(command);
    if (!result?.ok) { setTerminalOutput((value) => value + (result?.error ?? "Desktop runtime is unavailable.") + "\\n"); setRunning(false); }
  }

  async function stopCommand() {
    const result = await window.syntaxDesktop?.stopCommand();
    if (!result?.ok) setTerminalOutput((value) => value + (result?.error ?? "Unable to stop process.") + "\\n");
  }
  const previewDoc = useMemo(() => {
    const html = files.find((file) => file.name === "index.html")?.value ?? "<h1>Start building</h1>";
    const css = files.find((file) => file.name === "styles.css")?.value ?? "";
    const js = files.find((file) => file.name === "main.js")?.value ?? "";
    return html.replace("</head>", `<style>${css.replace(/<\\/style/gi, "")}</style></head>`)
      .replace("</body>", `<script>${js.replace(/<\\/script/gi, "")}</script></body>`);
  }, [files]);

  const updateCode = (value?: string) => setFiles((all) => all.map((file) => file.name === active ? { ...file, value: value ?? "" } : file));

  async function openFolder() {
    const result = await window.syntaxDesktop?.chooseProjectFolder();
    if (result?.path) {
      setProjectPath(result.path);
      const loaded = await window.syntaxDesktop?.readProjectFiles(result.path);
      if (loaded?.files?.length) {
        setFiles(loaded.files);
        setActive(loaded.files[0].name);
        setMessage(`Opened local project: ${result.path}`);
      } else setMessage("Folder opened. No supported source files were found at its top level.");
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
    setPanel("preview");
    setMessage("Local preview is running from the current editor buffer. It is not published to the internet.");
  }

  return (
    <main className="desktop">
      <header className="titlebar">
        <div className="brand"><span className="brandMark"><Braces size={21}/></span><span>SYNTAX</span><small>BEYOND THE CODE.</small></div>
        <div className="menubar"><button>File</button><button>Edit</button><button>Selection</button><button>View</button><button>Run</button><button>Terminal</button><button>Help</button></div>
        <div className="titleActions"><span className="localPill"><span/> Local workspace</span><button title="Notifications"><Bell size={17}/></button><button title="Settings"><Settings size={17}/></button></div>
      </header>

      <div className="workspace">
        <aside className="activitybar">
          <button className="selected" title="Explorer"><Files/></button><button title="Search"><Search/></button><button title="Source control"><GitBranch/></button><button title="Run and debug"><Play/></button><button title="Extensions"><Blocks/></button><div className="activitySpacer"/><button title="Cloud services"><Cloud/></button><button title="Settings"><Settings/></button>
        </aside>

        {explorerOpen && <aside className="explorer">
          <div className="sectionHeading">EXPLORER <span><Plus size={16}/></span></div>
          <button className="projectHeading" onClick={() => setExplorerOpen(false)}><ChevronDown size={14}/><FolderOpen size={15}/><strong>{projectPath === "No folder opened" ? "SYNTAX WORKSPACE" : projectPath.split(/[\\/]/).pop()}</strong></button>
          <div className="fileList">{files.map((file) => <button key={file.name} className={active === file.name ? "file active" : "file"} onClick={() => setActive(file.name)}><Braces size={15}/>{file.name}</button>)}</div>
          <button className="openFolder" onClick={openFolder}><FolderOpen size={15}/> Open project folder</button>
        </aside>}

        <section className="editorArea">
          <div className="tabs">{files.map((file) => <button key={file.name} className={active === file.name ? "tab activeTab" : "tab"} onClick={() => setActive(file.name)}><Braces size={15}/>{file.name}<span/></button>)}</div>
          <div className="editorMeta"><span>SYNTAX WORKSPACE</span><span>{current.name}</span><span>{current.language.toUpperCase()}</span><span className="metaSpacer"/><button onClick={saveWorkspace}>Save project</button></div>
          <div className="codeEditor"><Editor height="100%" theme="vs-dark" language={current.language} value={current.value} onChange={updateCode} options={{ minimap: { enabled: true }, fontSize: 14, fontFamily: "JetBrains Mono, Consolas, monospace", fontLigatures: true, padding: { top: 18 }, automaticLayout: true, scrollBeyondLastLine: false, smoothScrolling: true, cursorBlinking: "smooth" }}/></div>
          <div className="bottomPanel">
            <div className="panelTabs"><button className={panel === "terminal" ? "panelActive" : ""} onClick={() => setPanel("terminal")}><Terminal size={15}/> TERMINAL</button><button className={panel === "output" ? "panelActive" : ""} onClick={() => setPanel("output")}>OUTPUT</button><button className={panel === "preview" ? "panelActive" : ""} onClick={() => setPanel("preview")}>LOCAL PREVIEW</button><span/><button title="Hide panel"><PanelBottom size={16}/></button></div>
            {panel === "terminal" && <div className="terminalContent terminalLive"><pre aria-live="polite">{terminalOutput}</pre><form className="terminalCommand" onSubmit={executeCommand}><span>$</span><input aria-label="Terminal command" value={terminalCommand} onChange={(event) => setTerminalCommand(event.target.value)} placeholder={projectPath === "No folder opened" ? "Open a project folder to run commands" : "Enter a command, e.g. npm run dev"} disabled={projectPath === "No folder opened" || running}/><button type="submit" disabled={projectPath === "No folder opened" || running}>Run</button><button type="button" onClick={stopCommand} disabled={!running}>Stop</button></form></div>}
            {panel === "output" && <div className="terminalContent"><p>BUILD OUTPUT</p><p>{message}</p></div>}
            {panel === "preview" && <iframe title="Private local project preview" sandbox="allow-scripts" srcDoc={previewDoc} className="previewFrame"/>}
          </div>
        </section>
      </div>

      <footer className="statusbar"><span><GitBranch size={13}/> desktop</span><span>JavaScript</span><span className="statusSpacer"/><span><ShieldCheck size={13}/> Local-first workspace</span><span>UTF-8</span><span>Windows desktop preview</span></footer>
      <div className="welcomeOverlay" aria-hidden="true"><span><Command size={12}/> SYNTAX DESKTOP FOUNDATION</span><span><Monitor size={12}/> Windows 10 / 11 first</span><span><Download size={12}/> Installer pipeline in progress</span></div>
    </main>
  );
}
