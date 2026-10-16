
import { useState } from 'react';
import {
  Activity, Bot, Bug, ChevronDown, ChevronRight,
  CircleHelp, Code2, Command, Database, FileCode2,
  FileJson, Files, GitBranch, GitCommit, GitPullRequest,
  LayoutPanelLeft, Menu, Play, Plus, Search, Settings,
  ShieldCheck, Terminal, X, Zap
} from 'lucide-react';

const initialFiles = [
  { name: 'App.jsx', icon: FileCode2, color: '#61dafb' },
  { name: 'main.jsx', icon: FileCode2, color: '#61dafb' },
  { name: 'styles.css', icon: FileCode2, color: '#a78bfa' },
  { name: 'package.json', icon: FileJson, color: '#e9c46a' }
];

const starterCode = {
  'App.jsx': `import { useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('Hello, SYNTAX!');

  return (
    <main className="app">
      <h1>{message}</h1>
      <p>Beyond the Code.</p>
      <button onClick={() => setMessage('Keep building!')}>
        Get started
      </button>
    </main>
  );
}`,
  'main.jsx': `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  'styles.css': `:root {
  font-family: Inter, system-ui, sans-serif;
  color: #e4eee8;
  background: #07110d;
}

body {
  margin: 0;
  min-height: 100vh;
}

button {
  cursor: pointer;
}`,
  'package.json': `{
  "name": "syntax-ide",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "start": "vite --host 0.0.0.0 --port $PORT"
  }
}`
};

const keywords = new Set([
  'import', 'from', 'export', 'default', 'const', 'let',
  'return', 'function', 'useState', 'new', 'true', 'false'
]);

function highlight(line) {
  return line.split(/(\b(?:import|from|export|default|const|let|return|function|new|true|false|useState)\b|"[^"]*"|'[^']*'|`[^`]*`|\/\/.*$|\b\d+\b)/g)
    .map((part, i) => {
      let color = '#dce9e1';
      if (/^(\/\/)/.test(part)) color = '#688477';
      else if (/^["'`]/.test(part)) color = '#b9d98c';
      else if (/^\d+$/.test(part)) color = '#d9a6ff';
      else if (keywords.has(part)) color = '#8bc5ff';
      return <span key={i} style={{ color }}>{part}</span>;
    });
}

export default function App() {
  const [activeFile, setActiveFile] = useState('App.jsx');
  const [files, setFiles] = useState(initialFiles);
  const [contents, setContents] = useState(starterCode);
  const [activePanel, setActivePanel] = useState('Explorer');
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalText, setTerminalText] = useState('Welcome to SYNTAX Terminal\nYour development workspace is ready.\n$ ');
  const [command, setCommand] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(38);

  const code = contents[activeFile] || '';
  const lineCount = code.split('\n').length;

  function runCommand(e) {
    e.preventDefault();
    if (!command.trim()) return;
    const cmd = command.trim();
    let result = '';
    if (cmd === 'help') result = 'Available demo commands: help, clear, ls, pwd, npm run build';
    else if (cmd === 'clear') {
      setTerminalText('');
      setCommand('');
      return;
    } else if (cmd === 'ls') result = files.map(f => f.name).join('   ');
    else if (cmd === 'pwd') result = '/workspace/syntax-ide';
    else if (cmd === 'npm run build') result = 'Build preview only. Connect a real build environment to execute commands.';
    else result = `Command preview: "${cmd}"\nReal shell execution is not connected yet.`;
    setTerminalText(prev => `${prev}${cmd}\n${result}\n$ `);
    setCommand('');
  }

  function addFile() {
    const name = window.prompt('New filename (example: notes.js)');
    if (!name || !name.trim()) return;
    const clean = name.trim().split('/').pop();
    if (files.some(f => f.name === clean)) {
      setNotice('That filename already exists.');
      return;
    }
    const icon = clean.endsWith('.json') ? FileJson : FileCode2;
    setFiles(prev => [...prev, { name: clean, icon, color: '#a6c8b5' }]);
    setContents(prev => ({ ...prev, [clean]: '// Start writing your code here.\n' }));
    setActiveFile(clean);
    setNotice(`Created ${clean} in this preview session.`);
  }

  const navItems = [
    { name: 'Explorer', icon: Files },
    { name: 'Search', icon: Search },
    { name: 'Source Control', icon: GitBranch },
    { name: 'Run & Debug', icon: Bug },
    { name: 'Extensions', icon: Zap }
  ];

  return (
    <div className="syntax-app">
      <header className="titlebar">
        <div className="brand">
          <div className="brand-mark"><Code2 size={20} /></div>
          <div><strong>SYNTAX</strong><span>IDE</span></div>
        </div>
        <div className="title-center"><span>Beyond the Code.</span><span className="title-dot">/</span><span>{activeFile}</span></div>
        <div className="title-actions">
          <button title="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}><LayoutPanelLeft size={17} /></button>
          <button title="Settings" onClick={() => setNotice('Settings will be available in a future version.')}><Settings size={17} /></button>
        </div>
      </header>

      <div className="workspace">
        <aside className="activitybar">
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.name} title={item.name} className={activePanel === item.name ? 'activity active' : 'activity'} onClick={() => {
              setActivePanel(item.name);
              if (!sidebarOpen) setSidebarOpen(true);
            }}><Icon size={21} /></button>;
          })}
          <div className="activity-spacer" />
          <button className="activity" title="Accounts" onClick={() => setNotice('Account integration is coming soon.')}><ShieldCheck size={20} /></button>
          <button className="activity" title="Help" onClick={() => setNotice('SYNTAX IDE — Beyond the Code.')}><CircleHelp size={20} /></button>
        </aside>

        {sidebarOpen && <aside className="sidebar">
          <div className="side-heading"><span>{activePanel.toUpperCase()}</span><button title="Close sidebar" onClick={() => setSidebarOpen(false)}><X size={15} /></button></div>
          {activePanel === 'Explorer' && <>
            <div className="section-heading"><ChevronDown size={14} /><span>SYNTAX-WORKSPACE</span><button onClick={addFile} title="New file"><Plus size={15} /></button></div>
            {files.map(file => {
              const Icon = file.icon;
              return <button key={file.name} className={`file-row ${activeFile === file.name ? 'selected' : ''}`} onClick={() => setActiveFile(file.name)}><Icon size={16} color={file.color} /><span>{file.name}</span></button>;
            })}
            <button className="new-file" onClick={addFile}><Plus size={14} /> New file</button>
            <div className="side-section"><ChevronRight size={14} /> OUTLINE</div>
            <div className="side-section"><ChevronRight size={14} /> TIMELINE</div>
          </>}
          {activePanel === 'Search' && <>
            <input className="search-input" placeholder="Search workspace..." value={search} onChange={e => setSearch(e.target.value)} />
            {files.filter(f => f.name.toLowerCase().includes(search.toLowerCase())).map(f => <button className="file-row" key={f.name} onClick={() => setActiveFile(f.name)}><FileCode2 size={15} /><span>{f.name}</span></button>)}
          </>}
          {activePanel === 'Source Control' && <div className="sidebar-message"><GitBranch size={22} /><p>Source Control</p><span>Git changes and commits will appear here when version control is connected.</span><button onClick={() => setNotice('Your repository is hosted on GitHub.')}>Repository info</button></div>}
          {activePanel === 'Run & Debug' && <div className="sidebar-message"><Bug size={22} /><p>Run & Debug</p><span>Configure a debugger to start inspecting your application.</span><button onClick={() => setNotice('Debugger integration is not connected yet.')}>Configure debugger</button></div>}
          {activePanel === 'Extensions' && <div className="sidebar-message"><Zap size={22} /><p>Extensions</p><span>Extend your workspace with language tools and developer integrations.</span><button onClick={() => setNotice('Extension marketplace is planned.')}>Explore extensions</button></div>}
        </aside>}

        <main className="editor-area">
          <div className="tabs">
            <div className="tabs-scroll">{files.map(file => {
              const Icon = file.icon;
              return <button key={file.name} className={`tab ${activeFile === file.name ? 'tab-active' : ''}`} onClick={() => setActiveFile(file.name)}><Icon size={15} color={file.color} />{file.name}{activeFile === file.name && <span className="tab-dot" />}</button>;
            })}</div>
            <button className="run-button" title="Run preview" onClick={() => setNotice('Preview is ready. The live app runs after the project is deployed.')}><Play size={14} fill="currentColor" /> <span>Run</span></button>
          </div>

          <div className="breadcrumbs"><span>workspace</span><ChevronRight size={13} /><span>src</span><ChevronRight size={13} /><strong>{activeFile}</strong></div>

          <div className="code-editor">
            <div className="line-numbers">{Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}</div>
            <textarea
              aria-label="Code editor"
              spellCheck={false}
              value={code}
              onChange={e => setContents(prev => ({ ...prev, [activeFile]: e.target.value }))}
              className="code-input"
              style={{ tabSize: 2 }}
            />
          </div>

          {showTerminal && <section className="terminal-panel" style={{ '--terminal-height': `${terminalHeight}%` }}>
            <div className="terminal-top">
              <div className="terminal-tabs"><span className="terminal-tab-active"><Terminal size={14} /> TERMINAL</span><button onClick={() => setNotice('Problems panel is not connected yet.')}>PROBLEMS</button><button onClick={() => setNotice('Output panel is not connected yet.')}>OUTPUT</button></div>
              <div className="terminal-actions"><button title="Increase terminal size" onClick={() => setTerminalHeight(h => Math.min(65, h + 10))}><ChevronDown size={15} /></button><button title="Clear terminal" onClick={() => setTerminalText('')}><GitCommit size={15} /></button><button title="Close terminal" onClick={() => setShowTerminal(false)}><X size={15} /></button></div>
            </div>
            <div className="terminal-body">
              <pre>{terminalText}</pre>
              <form onSubmit={runCommand} className="terminal-form"><span>$</span><input value={command} onChange={e => setCommand(e.target.value)} placeholder="Type 'help' to see demo commands..." /></form>
            </div>
          </section>}

          {!showTerminal && <button className="show-terminal" onClick={() => setShowTerminal(true)}><Terminal size={14} /> Show Terminal</button>}

          <footer className="statusbar">
            <div><span><GitBranch size={13} /> main</span><span><GitPullRequest size={13} /> 0</span><span><Activity size={13} /> Ready</span></div>
            <div><span>UTF-8</span><span>JavaScript JSX</span><span>Ln 1, Col 1</span><button onClick={() => setNotice('SYNTAX IDE starter workspace')}><CircleHelp size={13} /></button></div>
          </footer>
        </main>
      </div>

      {notice && <div className="toast"><span>{notice}</span><button onClick={() => setNotice('')}><X size={14} /></button></div>}
    </div>
  );
}
