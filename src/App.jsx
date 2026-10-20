import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Blocks, Braces, ChevronDown, ChevronRight, CircleHelp, Cloud,
  Command, Download, FileCode2, Files, Folder, GitBranch, Pencil, Play, Search, Settings2, Trash2, Upload, Eye, Code2,
  ShieldCheck, Terminal, WandSparkles, X,
} from 'lucide-react';
import MonacoCodeEditor from './MonacoCodeEditor.jsx';
import { getCurrentSession, signInWithEmail, signUpWithEmail, signOut, supabase, supabaseConfigured } from './lib/supabase.js';
import CloudProjectsPanel from './CloudProjectsPanel.jsx';

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
  { name: 'Cloud Projects', icon: Cloud },
];

function buildPreviewDocument(files) {
  const normalize = (value) => {
    const parts = [];
    for (const part of value.replace(/\\/g, '/').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return parts.join('/');
  };
  const fileMap = new Map(files.map((file) => [normalize(file.name), file]));
  const htmlFile = files.find((file) => file.name.split('/').pop().toLowerCase() === 'index.html');
  let html = htmlFile?.content || '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SYNTAX Preview</title></head><body><main id="app"><h1>Beyond the Code.</h1><p>Create an index.html file to customize this preview.</p></main></body></html>';
  const htmlDirectory = htmlFile?.name.includes('/') ? htmlFile.name.slice(0, htmlFile.name.lastIndexOf('/')) : '';
  const findAsset = (assetPath) => {
    if (!assetPath || /^(?:[a-z]+:|\/\/|#|data:)/i.test(assetPath)) return null;
    let cleanPath;
    try { cleanPath = decodeURIComponent(assetPath.split(/[?#]/)[0]); } catch { return null; }
    const candidates = [normalize(htmlDirectory ? htmlDirectory + '/' + cleanPath : cleanPath), normalize(cleanPath.replace(/^\//, ''))];
    return candidates.map((candidate) => fileMap.get(candidate)).find(Boolean) ?? null;
  };
  let linkedScriptCount = 0;
  let linkedStyleCount = 0;
  html = html.replace(/<script\b([^>]*?)\bsrc=(["'])(.*?)\2([^>]*)>\s*(?:<\/script\s*>)?/gi, (tag, before, quote, src, after) => {
    const asset = findAsset(src);
    if (!asset || !/\.(?:m?js|cjs)$/i.test(asset.name)) return tag;
    linkedScriptCount += 1;
    const attributes = (before + ' ' + after).replace(/\s+src=(["']).*?\1/i, '').trim();
    return '<script' + (attributes ? ' ' + attributes : '') + '>' + asset.content.replace(/<\/script/gi, '<\\/script') + '</script>';
  });
  html = html.replace(/<link\b([^>]*?)\bhref=(["'])(.*?)\2([^>]*)>/gi, (tag, before, quote, href, after) => {
    const asset = findAsset(href);
    if (!asset || !/\.css$/i.test(asset.name) || !/stylesheet/i.test(before + ' ' + after)) return tag;
    linkedStyleCount += 1;
    return '<style>' + asset.content.replace(/<\/style/gi, '<\\/style') + '</style>';
  });
  const fallbackCss = files.filter((file) => file.name.toLowerCase().endsWith('.css')).map((file) => file.content).join('\n');
  const hasInlineStyles = /<style\b/i.test(html);
  const styleTag = fallbackCss && linkedStyleCount === 0 && !hasInlineStyles
    ? '<style>' + fallbackCss.replace(/<\/style/gi, '<\\/style') + '</style>'
    : '';
  if (styleTag) {
    const headClose = html.toLowerCase().indexOf('</head>');
    html = headClose >= 0 ? html.slice(0, headClose) + styleTag + html.slice(headClose) : styleTag + html;
  }
  const hasScript = /<script\b/i.test(html);
  if (!hasScript && linkedScriptCount === 0) {
    const entry = ['src/main.js', 'main.js', 'src/index.js', 'index.js', 'app.js']
      .map((name) => fileMap.get(name)).find(Boolean);
    if (entry) {
      const scriptTag = '<script>' + entry.content.replace(/<\/script/gi, '<\\/script') + '</script>';
      const bodyClose = html.toLowerCase().indexOf('</body>');
      html = bodyClose >= 0 ? html.slice(0, bodyClose) + scriptTag + html.slice(bodyClose) : html + scriptTag;
    }
  }
  return html;
}

export default function App() {
  const [files, setFiles] = useState(() => { try { const saved = window.localStorage.getItem('syntax-ide-local-files-v1'); return saved ? JSON.parse(saved) : initialFiles; } catch { return initialFiles; } });
  const [activeName, setActiveName] = useState('main.js');
  const [activePanel, setActivePanel] = useState('Explorer');
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [terminalText, setTerminalText] = useState('SYNTAX IDE terminal\nWorkspace shell is not connected yet.\n');
  const [command, setCommand] = useState('');
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveState, setSaveState] = useState('Saved locally');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [authBusy, setAuthBusy] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const importInputRef = useRef(null);
  const activeFile = files.find((file) => file.name === activeName) ?? files[0];
  const folderGroups = useMemo(() => {
    const groups = new Map();
    [...files].sort((a, b) => a.name.localeCompare(b.name)).forEach((file) => {
      const parts = file.name.split('/');
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(file);
    });
    return [...groups.entries()];
  }, [files]);
  const previewDocument = useMemo(() => buildPreviewDocument(files), [files]);
  const languageNames = useMemo(() => ({ javascript: 'JavaScript', html: 'HTML', css: 'CSS', typescript: 'TypeScript', json: 'JSON' }), []);

  useEffect(() => { try { window.localStorage.setItem('syntax-ide-local-files-v1', JSON.stringify(files)); setSaveState('Saved locally'); } catch { setSaveState('Local save unavailable'); } }, [files]);
  const matchingFiles = files.filter((file) => !searchQuery.trim() || file.name.toLowerCase().includes(searchQuery.toLowerCase()) || file.content.toLowerCase().includes(searchQuery.toLowerCase()));
  const searchExcerpt = (content, query) => {
    if (!query.trim()) return '';
    const line = content.split('\n').find((item) => item.toLowerCase().includes(query.toLowerCase()));
    return line ? line.trim().slice(0, 90) : '';
  };

  useEffect(() => {
    function handleWorkspaceShortcuts(event) {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        const target = window.prompt('Quick Open — enter an exact file name:\n' + files.map((file) => file.name).join('\n'), activeName);
        if (target && files.some((file) => file.name === target)) {
          setActiveName(target);
          setActivePanel('Explorer');
        } else if (target) {
          setNotice('No workspace file named "' + target + '".');
        }
      } else if (event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setActivePanel('Search');
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        setNotice('Your workspace is saved automatically in this browser. Use Export for a portable backup.');
      }
    }
    window.addEventListener('keydown', handleWorkspaceShortcuts);
    return () => window.removeEventListener('keydown', handleWorkspaceShortcuts);
  }, [files, activeName]);

  useEffect(() => {
    let active = true;
    getCurrentSession().then(({ session }) => { if (active) setAuthUser(session?.user ?? null); });
    const { data } = supabase?.auth.onAuthStateChange((_event, session) => setAuthUser(session?.user ?? null)) ?? { data: null };
    return () => { active = false; data?.subscription?.unsubscribe(); };
  }, []);

  async function handleAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    try {
      const result = authMode === 'signup'
        ? await signUpWithEmail(authEmail.trim(), authPassword)
        : await signInWithEmail(authEmail.trim(), authPassword);
      if (result.error) throw result.error;
      if (authMode === 'signup' && !result.data?.session) setNotice('Account created. Check your email to confirm the address, then sign in.');
      else setNotice(authMode === 'signup' ? 'Account created and signed in.' : 'Signed in successfully.');
      setAuthPassword('');
    } catch (error) {
      setNotice(error?.message || 'Authentication failed. Check your settings and try again.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    const { error } = await signOut();
    if (error) setNotice(error.message);
    else { setAuthUser(null); setNotice('Signed out.'); }
  }

  function exportWorkspace() {
    const payload = {
      format: 'syntax-ide-workspace',
      version: 1,
      exportedAt: new Date().toISOString(),
      files,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'syntax-ide-workspace.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice('Workspace exported as a JSON backup.');
  }

  async function importWorkspace(event) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      if (selectedFile.size > 5 * 1024 * 1024) {
        throw new Error('Backup is too large. Choose a JSON file under 5 MB.');
      }

      const payload = JSON.parse(await selectedFile.text());
      if (payload?.format !== 'syntax-ide-workspace' || payload?.version !== 1 || !Array.isArray(payload.files)) {
        throw new Error('This file is not a supported SYNTAX IDE workspace backup.');
      }
      if (payload.files.length < 1 || payload.files.length > 500) {
        throw new Error('A workspace backup must contain between 1 and 500 files.');
      }

      const seenNames = new Set();
      const restoredFiles = payload.files.map((file) => {
        if (!file || typeof file.name !== 'string' || file.name.length > 180 || !file.name.split('/').every((part) => /^[\w.-]{1,100}$/.test(part) && part !== '.' && part !== '..')) {
          throw new Error('The backup contains an invalid file name.');
        }
        if (seenNames.has(file.name)) throw new Error('The backup contains duplicate file names.');
        seenNames.add(file.name);
        if (typeof file.content !== 'string' || file.content.length > 1024 * 1024) {
          throw new Error('A file is invalid or exceeds the 1 MB per-file limit.');
        }
        const language = typeof file.language === 'string' && file.language.length <= 40 ? file.language : 'plaintext';
        return { name: file.name, language, content: file.content };
      });

      if (!window.confirm(`Import ${restoredFiles.length} file(s)? This will replace the files currently in your local workspace.`)) return;
      setFiles(restoredFiles);
      setActiveName(restoredFiles[0].name);
      setActivePanel('Explorer');
      setNotice(`Workspace restored: ${restoredFiles.length} file(s) imported.`);
    } catch (error) {
      setNotice(error?.message || 'Could not import this workspace backup.');
    } finally {
      event.target.value = '';
    }
  }

  function updateContent(value) {
    setSaveState('Saving…');
    setFiles((current) => current.map((file) => file.name === activeName ? { ...file, content: value } : file));
  }

  function createFile() {
    const name = window.prompt('New file name (for example app.ts):');
    if (!name) return;
    if (name.length > 180 || !name.split('/').every((part) => /^[\w.-]{1,100}$/.test(part) && part !== '.' && part !== '..') || files.some((file) => file.name === name)) {
      setNotice('Choose a unique file name using letters, numbers, dots, dashes or underscores.');
      return;
    }
    const extension = name.split('.').pop();
    const language = ({ js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', html: 'html', css: 'css', json: 'json' })[extension] ?? 'plaintext';
    setFiles((current) => [...current, { name, language, content: '' }]);
    setActiveName(name);
    setNotice(`Created local draft: ${name}`);
  }

  function renameActiveFile() {
    if (!activeFile) return;
    const nextName = window.prompt('Rename file:', activeFile.name);
    if (!nextName || nextName === activeFile.name) return;
    if (nextName.length > 180 || !nextName.split('/').every((part) => /^[\w.-]{1,100}$/.test(part) && part !== '.' && part !== '..') || files.some((file) => file.name === nextName)) {
      setNotice('Choose a unique file name using letters, numbers, dots, dashes or underscores.');
      return;
    }
    const extension = nextName.split('.').pop().toLowerCase();
    const language = ({ js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', html: 'html', css: 'css', json: 'json', md: 'markdown', py: 'python', php: 'php', sql: 'sql', java: 'java', c: 'c', cpp: 'cpp', cs: 'csharp', go: 'go', rs: 'rust' })[extension] ?? activeFile.language;
    setFiles((current) => current.map((file) => file.name === activeFile.name ? { ...file, name: nextName, language } : file));
    setActiveName(nextName);
    setNotice(`Renamed file to ${nextName}.`);
  }

  function deleteActiveFile() {
    if (!activeFile) return;
    if (files.length === 1) {
      setNotice('Keep at least one file in the workspace. Create another file before deleting this one.');
      return;
    }
    if (!window.confirm(`Delete ${activeFile.name} from this local workspace? This cannot be undone.`)) return;
    const remaining = files.filter((file) => file.name !== activeFile.name);
    setFiles(remaining);
    setActiveName(remaining[0].name);
    setNotice(`Deleted ${activeFile.name} from the local workspace.`);
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
        <div className="title-actions"><button title="Import workspace backup" onClick={() => importInputRef.current?.click()}><Upload size={17} /></button><input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={importWorkspace} /><button title="Export workspace backup" onClick={exportWorkspace}><Download size={17} /></button><button title="Help" onClick={() => setNotice('SYNTAX IDE preview — cloud workspaces and authentication are the next milestones.')}><CircleHelp size={17} /></button><button title="Settings" onClick={() => setNotice('Settings panel is planned for the next build.')}><Settings2 size={17} /></button></div>
      </header>
      <div className="ide-body">
        <nav className="activitybar" aria-label="Workspace tools">
          {iconActions.map(({ name, icon: Icon }) => <button key={name} className={activePanel === name ? 'active' : ''} title={name} onClick={() => setActivePanel(name)}><Icon size={20} /></button>)}
          <div className="activity-spacer" />
          <button title="Security" onClick={() => setNotice('Security-first architecture: user code will run in isolated workspaces, never inside the API process.')}><ShieldCheck size={19} /></button>
          <button title="Account" onClick={() => setActivePanel('Account')}><Settings2 size={19} /></button>
        </nav>
        <aside className="sidebar">
          <div className="sidebar-heading"><span>{activePanel.toUpperCase()}</span><div className="sidebar-tools">{activePanel === 'Explorer' && <><button onClick={renameActiveFile} title="Rename active file"><Pencil size={14} /></button><button onClick={deleteActiveFile} title="Delete active file"><Trash2 size={14} /></button></>}<button onClick={createFile} title="New file"><span className="plus">+</span></button></div></div>
          {activePanel === 'Cloud Projects' ? <CloudProjectsPanel authUser={authUser} files={files} onLoad={(project, loadedFiles) => { setFiles(loadedFiles); setActiveName(loadedFiles[0]?.name ?? 'main.js'); setNotice('Loaded cloud project: ' + project.name); setActivePanel('Explorer'); }} onNotice={setNotice} /> : activePanel === 'Explorer' ? <>
            <div className="tree-heading"><ChevronDown size={14} /><span>SYNTAX-WORKSPACE</span><button onClick={createFile} title="New file">+</button></div>
            <div className="file-list">{folderGroups.map(([folder, groupedFiles]) => <div className="file-group" key={folder || '__root__'}>{folder && <button className="folder-row" onClick={() => setCollapsedFolders((current) => ({ ...current, [folder]: !current[folder] }))} aria-expanded={!collapsedFolders[folder]}>{collapsedFolders[folder] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}<Folder size={14} /><span>{folder}</span></button>}{(!folder || !collapsedFolders[folder]) && groupedFiles.map((file) => <button key={file.name} className={activeName === file.name ? 'file-row selected' : 'file-row'} onClick={() => { setActiveName(file.name); setPreviewOpen(false); }}><FileCode2 size={15} /><span>{file.name.split('/').pop()}</span></button>)}</div>)}</div>
            <div className="sidebar-bottom"><Activity size={14} /><span>Draft workspace · local only</span></div>
          </> : activePanel === 'Search' ? <div className="search-panel"><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search names and code…" aria-label="Search file names and contents" /><p className="search-hint">Search across file names and source code.</p>{matchingFiles.length ? matchingFiles.map((file) => <button key={file.name} className="search-result" onClick={() => { setActiveName(file.name); setActivePanel('Explorer'); }}><span className="search-result-title"><FileCode2 size={14} />{file.name}</span>{searchExcerpt(file.content, searchQuery) && <code>{searchExcerpt(file.content, searchQuery)}</code>}</button>) : <p>No matching files or code lines.</p>}</div> : activePanel === 'Account' ? <div className="account-panel">{authUser ? <><strong>Signed in</strong><p>{authUser.email}</p><button className="auth-button secondary" onClick={handleSignOut}>Sign out</button></> : <><strong>{authMode === 'signup' ? 'Create your account' : 'Sign in to SYNTAX'}</strong><p>{supabaseConfigured ? 'Use your email to access your account.' : 'Authentication UI is ready. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in hosting settings to activate sign-in.'}</p><form onSubmit={handleAuth}><label>Email<input type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 6 characters" /></label><button className="auth-button" type="submit" disabled={authBusy || !supabaseConfigured}>{authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button></form><button className="auth-mode-switch" onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}>{authMode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button></>}</div> : <div className="empty-panel"><WandSparkles size={22} /><strong>{activePanel}</strong><p>This tool is scaffolded for a future full-stack integration.</p></div>}
        </aside>
        <section className="workbench">
          <div className="tabs">{files.map((file) => <button key={file.name} className={activeName === file.name ? 'tab selected' : 'tab'} onClick={() => setActiveName(file.name)}><FileCode2 size={14} /><span>{file.name}</span>{activeName === file.name && <span className="tab-dot" />}</button>)}<div className="tabs-spacer" /><button className="run-button" onClick={() => setPreviewOpen((open) => !open)}>{previewOpen ? <Code2 size={14} /> : <Eye size={14} />}{previewOpen ? 'Editor' : 'Preview'}</button><button className="run-button" onClick={() => { setTerminalOpen(true); setTerminalText((current) => current + '\nBuild/run requested. Browser preview is available; shell execution still requires an isolated runtime.\n'); }}><Play size={14} /> Run</button></div>
          <div className="breadcrumb"><span>SYNTAX-WORKSPACE</span><ChevronRight size={13} /><span>{activeFile.name}</span><span className="breadcrumb-language">{languageNames[activeFile.language] ?? activeFile.language}</span></div>
          <div className={previewOpen ? 'editor-area preview-area' : 'editor-area'}>{previewOpen ? <iframe title="SYNTAX web project preview" sandbox="allow-scripts" srcDoc={previewDocument} /> : <MonacoCodeEditor value={activeFile.content} language={activeFile.language} onChange={updateContent} />}</div>
          {terminalOpen && <section className="terminal"><div className="terminal-heading"><div><button className="terminal-tab selected"><Terminal size={14} /> TERMINAL</button><button className="terminal-tab" onClick={() => setTerminalText('Output panel is ready for a connected build runner.\n')}>OUTPUT</button></div><button onClick={() => setTerminalOpen(false)} title="Close terminal"><X size={15} /></button></div><pre>{terminalText}</pre><form onSubmit={runCommand} className="terminal-input"><span>$</span><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Type a command (preview only)" aria-label="Terminal command" /><button type="submit">Send</button></form></section>}
          <footer className="statusbar"><span><GitBranch size={13} /> main*</span><span>UTF-8</span><span>{languageNames[activeFile.language] ?? activeFile.language}</span><span className="status-spacer" /><span><ShieldCheck size={13} /> {saveState}</span><span><Command size={13} /> SYNTAX</span></footer>
        </section>
      </div>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
    </main>
  );
}
