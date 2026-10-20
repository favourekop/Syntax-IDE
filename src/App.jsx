import { useMemo, useState } from 'react';
import {
  Activity, Blocks, Braces, ChevronDown, ChevronRight, CircleHelp,
  Command, FileCode2, Files, GitBranch, Play, Search, Settings2,
  ShieldCheck, Terminal, WandSparkles, X,
} from 'lucide-react';
import MonacoCodeEditor from './MonacoCodeEditor.jsx';

const initialFiles = [
  { name: 'main.js', language: 'javascript', content: "const greeting = 'Beyond the Code.';\n\nfunction startSyntax() {\n  console.log(greeting);\n}\n\nstartSyntax();\n" },
  { name: 'index.html', language: 'html', content: '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>SYNTAX IDE</title>\n  </head>\n  <body>\n    <main id="app"></main>\n  </body>\n</html>\n' },
  { name: 'styles.css', language: 'css', content: ':root {\n  color-scheme: dark;\n  font-family: Inter, system-ui, sans-serif;\n}\n\nbody {\n  margin: 0;\n  background: #07110d;\n  color: #e7f1eb;\n}\n' },
];

const iconActions = [
  { name: 'Explorer', icon: Files },
  { name: 'Search', icon: Search },
  { name: 'Source Control', icon: GitBranch },
  { name: 'Run and Debug', icon: Play },
  { name: 'Extensions', icon: Blocks },
];

export default function App() {
  const [files, setFiles] = useState(initialFiles);
  const [activeName, setActiveName] = useState('main.js');
  const [activePanel, setActivePanel] = useState('Explorer');
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalText, setTerminalText] = useState('SYNTAX IDE terminal\nWorkspace shell is not connected yet.\n');
  const [command, setCommand] = useState('');
  const [notice, setNotice] = useState('');
  const activeFile = files.find((file) => file.name === activeName) ?? files[0];
  const languageNames = useMemo(() => ({ javascript: 'JavaScript', html: 'HTML', css: 'CSS', typescript: 'TypeScript', json: 'JSON' }), []);

  function updateContent(value) {
    setFiles((current) => current.map((file) => file.name === activeName ? { ...file, content: value } : file));
  }

  function createFile() {
    const name = window.prompt('New file name (for example app.ts):');
    if (!name) return;
    if (!/^[\w.-]+$/.test(name) || files.some((file) => file.name === name)) {
      setNotice('Choose a unique file name using letters, numbers, dots, dashes or underscores.');
      return;
    }
    const extension = name.split('.').pop();
    const language = ({ js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', html: 'html', css: 'css', json: 'json' })[extension] ?? 'plaintext';
    setFiles((current) => [...current, { name, language, content: '' }]);
    setActiveName(name);
    setNotice(`Created local draft: ${name}`);
  }

  function runCommand(event) {
    event.preventDefault();
    if (!command.trim()) return;
    setTerminalText((current) => current + `\n$ ${command}\nTerminal runtime is not connected yet. This preview does not execute shell commands.\n`);
    setCommand('');
    setTerminalOpen(true);
  }

  return (
    <main className="ide-shell">
      <header className="titlebar">
        <div className="brand"><div className="brand-mark"><Braces size={19} /></div><div><strong>SYNTAX</strong><span>BEYOND THE CODE</span></div></div>
        <div className="workspace-label"><span className="live-dot" /> Local workspace <ChevronDown size={14} /></div>
        <div className="title-actions"><button title="Help" onClick={() => setNotice('SYNTAX IDE preview — cloud workspaces and authentication are the next milestones.')}><CircleHelp size={17} /></button><button title="Settings" onClick={() => setNotice('Settings panel is planned for the next build.')}><Settings2 size={17} /></button></div>
      </header>
      <div className="ide-body">
        <nav className="activitybar" aria-label="Workspace tools">
          {iconActions.map(({ name, icon: Icon }) => <button key={name} className={activePanel === name ? 'active' : ''} title={name} onClick={() => setActivePanel(name)}><Icon size={20} /></button>)}
          <div className="activity-spacer" />
          <button title="Security" onClick={() => setNotice('Security-first architecture: user code will run in isolated workspaces, never inside the API process.')}><ShieldCheck size={19} /></button>
          <button title="Account" onClick={() => setNotice('Sign-in and account profiles are not connected yet.')}><Settings2 size={19} /></button>
        </nav>
        <aside className="sidebar">
          <div className="sidebar-heading"><span>{activePanel.toUpperCase()}</span><button onClick={createFile} title="New file"><span className="plus">+</span></button></div>
          {activePanel === 'Explorer' ? <>
            <div className="tree-heading"><ChevronDown size={14} /><span>SYNTAX-WORKSPACE</span><button onClick={createFile} title="New file">+</button></div>
            <div className="file-list">{files.map((file) => <button key={file.name} className={activeName === file.name ? 'file-row selected' : 'file-row'} onClick={() => setActiveName(file.name)}><FileCode2 size={15} /><span>{file.name}</span></button>)}</div>
            <div className="sidebar-bottom"><Activity size={14} /><span>Draft workspace · local only</span></div>
          </> : <div className="empty-panel"><WandSparkles size={22} /><strong>{activePanel}</strong><p>This tool is scaffolded for a future full-stack integration.</p></div>}
        </aside>
        <section className="workbench">
          <div className="tabs">{files.map((file) => <button key={file.name} className={activeName === file.name ? 'tab selected' : 'tab'} onClick={() => setActiveName(file.name)}><FileCode2 size={14} /><span>{file.name}</span>{activeName === file.name && <span className="tab-dot" />}</button>)}<div className="tabs-spacer" /><button className="run-button" onClick={() => { setTerminalOpen(true); setTerminalText((current) => current + '\nPreview run requested. Connect an isolated workspace runtime to execute this project.\n'); }}><Play size={14} /> Run</button></div>
          <div className="breadcrumb"><span>SYNTAX-WORKSPACE</span><ChevronRight size={13} /><span>{activeFile.name}</span><span className="breadcrumb-language">{languageNames[activeFile.language] ?? activeFile.language}</span></div>
          <div className="editor-area"><MonacoCodeEditor value={activeFile.content} language={activeFile.language} onChange={updateContent} /></div>
          {terminalOpen && <section className="terminal"><div className="terminal-heading"><div><button className="terminal-tab selected"><Terminal size={14} /> TERMINAL</button><button className="terminal-tab" onClick={() => setTerminalText('Output panel is ready for a connected build runner.\n')}>OUTPUT</button></div><button onClick={() => setTerminalOpen(false)} title="Close terminal"><X size={15} /></button></div><pre>{terminalText}</pre><form onSubmit={runCommand} className="terminal-input"><span>$</span><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Type a command (preview only)" aria-label="Terminal command" /><button type="submit">Send</button></form></section>}
          <footer className="statusbar"><span><GitBranch size={13} /> main*</span><span>UTF-8</span><span>{languageNames[activeFile.language] ?? activeFile.language}</span><span className="status-spacer" /><span><ShieldCheck size={13} /> Safe preview</span><span><Command size={13} /> SYNTAX</span></footer>
        </section>
      </div>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
    </main>
  );
}
