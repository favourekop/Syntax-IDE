import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Blocks, Braces, ChevronDown, ChevronRight, CircleHelp, Cloud, FolderPlus,
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
  const monitor = '<script>(function(){const send=(kind,args)=>{try{parent.postMessage({source:"syntax-preview",kind,text:Array.from(args).map(v=>{if(typeof v==="string")return v;try{return JSON.stringify(v)}catch{return String(v)}}).join(" ")}, "*")}catch{}};["log","warn","error","info"].forEach(k=>{const original=console[k].bind(console);console[k]=(...args)=>{original(...args);send(k,args)}});window.addEventListener("error",e=>send("error",[e.message+" ("+e.filename+":"+e.lineno+")"]));window.addEventListener("unhandledrejection",e=>send("error",["Unhandled promise rejection",e.reason]));})();</script>';
  const fileMap = new Map(files.map((file) => [normalize(file.name), file]));
  const htmlFile = files.find((file) => file.name.split('/').pop().toLowerCase() === 'index.html');
  let html = htmlFile?.content || '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SYNTAX Preview</title></head><body><main id="app"><h1>Beyond the Code.</h1><p>Create an index.html file to customize this preview.</p></main></body></html>';
  const htmlDirectory = htmlFile?.name.includes('/') ? htmlFile.name.slice(0, htmlFile.name.lastIndexOf('/')) : '';
  const headCloseForMonitor = html.toLowerCase().indexOf('</head>');
  html = headCloseForMonitor >= 0
    ? html.slice(0, headCloseForMonitor) + monitor + html.slice(headCloseForMonitor)
    : monitor + html;
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
  const [editorSettings, setEditorSettings] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('syntax-ide-editor-settings-v1') || '{}');
      return {
        fontSize: [12, 13, 14, 15, 16, 18, 20].includes(saved.fontSize) ? saved.fontSize : 13,
        wordWrap: saved.wordWrap === 'off' ? 'off' : 'on',
        minimapEnabled: Boolean(saved.minimapEnabled),
      };
    } catch { return { fontSize: 13, wordWrap: 'on', minimapEnabled: false }; }
  });
  const importInputRef = useRef(null);
  const previewFrameRef = useRef(null);
  const workspaceBaselineRef = useRef(new Map(files.map((file) => [file.name, { ...file }])));
  const workspaceChanges = useMemo(() => {
    const current = new Map(files.map((file) => [file.name, file]));
    const changes = [];
    for (const [name, original] of workspaceBaselineRef.current) {
      const now = current.get(name);
      if (!now) changes.push({ name, kind: 'deleted' });
      else if (now.content !== original.content || now.language !== original.language) changes.push({ name, kind: 'modified' });
    }
    for (const file of files) {
      if (!workspaceBaselineRef.current.has(file.name)) changes.push({ name: file.name, kind: 'added' });
    }
    return changes.sort((a, b) => a.name.localeCompare(b.name));
  }, [files]);
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
  useEffect(() => {
    try { window.localStorage.setItem('syntax-ide-editor-settings-v1', JSON.stringify(editorSettings)); }
    catch { setNotice('Editor preferences could not be saved in this browser.'); }
  }, [editorSettings]);

  useEffect(() => {
    function handlePreviewMessage(event) {
      if (event.source !== previewFrameRef.current?.contentWindow) return;
      if (event.data?.source !== 'syntax-preview' || typeof event.data.text !== 'string') return;
      const level = ['error', 'warn'].includes(event.data.kind) ? event.data.kind.toUpperCase() : 'LOG';
      setTerminalText((current) => current + '\n[preview ' + level + '] ' + event.data.text.slice(0, 1200) + '\n');
      if (event.data.kind === 'error') setTerminalOpen(true);
    }
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, []);
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
      if (event.key === ',' ) {
        event.preventDefault();
        setActivePanel('Settings');
      } else if (event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        setPreviewOpen((open) => !open);
      } else if (event.key.toLowerCase() === 'p') {
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
    const language = ({ js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript', mts: 'typescript', tsx: 'typescript', html: 'html', htm: 'html', css: 'css', scss: 'scss', json: 'json', md: 'markdown', mdx: 'markdown', py: 'python', php: 'php', sql: 'sql', java: 'java', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cs: 'csharp', go: 'go', rs: 'rust', sh: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml', svg: 'xml', toml: 'ini', env: 'dotenv' })[extension] ?? 'plaintext';
    setFiles((current) => [...current, { name, language, content: '' }]);
    setActiveName(name);
    setNotice(`Created local draft: ${name}`);
  }

  function createProjectTemplate() {
    const choice = window.prompt(
      'Create a project template — enter a number:\n1. HTML, CSS & JavaScript\n2. React + Vite starter\n3. Node.js API starter\n4. Python script starter',
      '1',
    );
    if (!choice) return;

    const templates = {
      '1': {
        name: 'Web Starter',
        files: [
          { name: 'index.html', language: 'html', content: '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>My Web Project</title>\n    <link rel="stylesheet" href="styles.css" />\n  </head>\n  <body>\n    <main class="container">\n      <p class="eyebrow">BUILT WITH SYNTAX</p>\n      <h1>Beyond the Code.</h1>\n      <p>Your next idea starts here.</p>\n      <button id="start-button">Get started</button>\n    </main>\n    <script src="main.js"></script>\n  </body>\n</html>\n' },
          { name: 'styles.css', language: 'css', content: ':root { font-family: Inter, system-ui, sans-serif; color: #e8f4ec; background: #07110d; }\nbody { min-height: 100vh; margin: 0; display: grid; place-items: center; }\n.container { max-width: 640px; padding: 3rem; }\n.eyebrow { color: #45d88b; font-size: .75rem; letter-spacing: .18em; }\nh1 { font-size: clamp(2.5rem, 8vw, 5rem); margin: .5rem 0; }\np { color: #a6bcad; line-height: 1.7; }\nbutton { padding: .8rem 1rem; border: 0; border-radius: .5rem; background: #35d07f; color: #07110d; font-weight: 700; cursor: pointer; }\n' },
          { name: 'main.js', language: 'javascript', content: "document.querySelector('#start-button').addEventListener('click', () => {\n  document.querySelector('h1').textContent = 'You are ready to build.';\n  console.log('Welcome to your new SYNTAX project!');\n});\n" },
          { name: 'README.md', language: 'markdown', content: '# My Web Project\n\nA starter website created in SYNTAX IDE.\n\n## Files\n- `index.html`: page structure\n- `styles.css`: visual styles\n- `main.js`: browser interactions\n\nOpen Preview in SYNTAX to view the website.\n' },
        ],
      },
      '2': {
        name: 'React + Vite Starter',
        files: [
          { name: 'package.json', language: 'json', content: '{\n  "name": "syntax-react-starter",\n  "private": true,\n  "version": "0.1.0",\n  "type": "module",\n  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },\n  "dependencies": { "react": "latest", "react-dom": "latest" },\n  "devDependencies": { "@vitejs/plugin-react": "latest", "vite": "latest" }\n}\n' },
          { name: 'index.html', language: 'html', content: '<!doctype html>\n<html lang="en">\n  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>React Starter</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>\n</html>\n' },
          { name: 'vite.config.js', language: 'javascript', content: "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({ plugins: [react()] });\n" },
          { name: 'src/main.jsx', language: 'javascript', content: "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\nimport './styles.css';\n\ncreateRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);\n" },
          { name: 'src/App.jsx', language: 'javascript', content: "export default function App() {\n  return (\n    <main className=\"app\">\n      <p className=\"eyebrow\">BUILT WITH SYNTAX</p>\n      <h1>Beyond the Code.</h1>\n      <p>Your React project is ready for your ideas.</p>\n      <button onClick={() => alert('Let us build something great!')}>Get started</button>\n    </main>\n  );\n}\n" },
          { name: 'src/styles.css', language: 'css', content: "body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #07110d; color: #e8f4ec; }\n.app { min-height: 100vh; display: grid; align-content: center; justify-items: start; padding: 2rem clamp(1.5rem, 8vw, 8rem); box-sizing: border-box; }\n.eyebrow { color: #45d88b; letter-spacing: .18em; font-size: .75rem; }\nh1 { font-size: clamp(2.5rem, 8vw, 5rem); margin: .5rem 0; }\np { color: #a6bcad; line-height: 1.7; }\nbutton { padding: .8rem 1rem; border: 0; border-radius: .5rem; background: #35d07f; color: #07110d; font-weight: 700; cursor: pointer; }\n" },
          { name: 'README.md', language: 'markdown', content: '# React + Vite Starter\n\nInstall dependencies with `npm install`, then run `npm run dev`.\n\nNote: SYNTAX browser preview does not bundle JSX yet; run this starter through a Vite runtime when connected.\n' },
        ],
      },
      '3': {
        name: 'Node API Starter',
        files: [
          { name: 'package.json', language: 'json', content: '{\n  "name": "syntax-node-api",\n  "private": true,\n  "type": "module",\n  "scripts": { "start": "node src/server.js", "dev": "node --watch src/server.js" },\n  "engines": { "node": ">=20" }\n}\n' },
          { name: 'src/server.js', language: 'javascript', content: "import { createServer } from 'node:http';\n\nconst server = createServer((request, response) => {\n  response.setHeader('content-type', 'application/json; charset=utf-8');\n  if (request.url === '/health') {\n    response.writeHead(200);\n    response.end(JSON.stringify({ status: 'ok', service: 'syntax-api' }));\n    return;\n  }\n  response.writeHead(404);\n  response.end(JSON.stringify({ error: 'Not found' }));\n});\n\nconst port = Number(process.env.PORT || 3000);\nserver.listen(port, '0.0.0.0', () => console.log('API listening on ' + port));\n" },
          { name: '.env.example', language: 'dotenv', content: 'PORT=3000\n' },
          { name: 'README.md', language: 'markdown', content: '# Node API Starter\n\nA minimal Node.js HTTP API with a health route.\n\n## Run\n```sh\nnpm install\nnpm run dev\n```\n\nTry `GET /health`. A connected isolated runtime is required to execute this API from SYNTAX.\n' },
        ],
      },
      '4': {
        name: 'Python Starter',
        files: [
          { name: 'main.py', language: 'python', content: 'def main():\n    message = "Beyond the Code."\n    print(message)\n\n\nif __name__ == "__main__":\n    main()\n' },
          { name: 'README.md', language: 'markdown', content: '# Python Starter\n\nA clean starting point for a Python project.\n\nRun with `python main.py` in a Python environment. SYNTAX shell execution is not connected yet.\n' },
        ],
      },
    };
    const template = templates[choice];
    if (!template) {
      setNotice('Choose 1, 2, 3 or 4 to select a project template.');
      return;
    }
    if (!window.confirm('Create ' + template.name + '? This replaces the files in your current local workspace. Export a backup first if you need these files.')) return;
    setFiles(template.files);
    setActiveName(template.files[0].name);
    setActivePanel('Explorer');
    setPreviewOpen(false);
    setNotice(template.name + ' created with ' + template.files.length + ' starter files.');
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
        <div className="title-actions"><button title="New project from template" onClick={createProjectTemplate}><FolderPlus size={17} /></button><button title="Import workspace backup" onClick={() => importInputRef.current?.click()}><Upload size={17} /></button><input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={importWorkspace} /><button title="Export workspace backup" onClick={exportWorkspace}><Download size={17} /></button><button title="Help" onClick={() => setNotice('SYNTAX IDE preview — cloud workspaces and authentication are the next milestones.')}><CircleHelp size={17} /></button><button title="Settings" onClick={() => setActivePanel('Settings')}><Settings2 size={17} /></button></div>
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
          </> : activePanel === 'Search' ? <div className="search-panel"><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search names and code…" aria-label="Search file names and contents" /><p className="search-hint">Search across file names and source code.</p>{matchingFiles.length ? matchingFiles.map((file) => <button key={file.name} className="search-result" onClick={() => { setActiveName(file.name); setActivePanel('Explorer'); }}><span className="search-result-title"><FileCode2 size={14} />{file.name}</span>{searchExcerpt(file.content, searchQuery) && <code>{searchExcerpt(file.content, searchQuery)}</code>}</button>) : <p>No matching files or code lines.</p>}</div> : activePanel === 'Source Control' ? <div className="search-panel source-control-panel"><strong className="source-control-title"><GitBranch size={15} /> Local changes</strong><p className="search-hint">Changes are compared with the workspace as it was opened. This is not a Git commit or remote repository connection.</p><div className="change-summary">{workspaceChanges.length} change{workspaceChanges.length === 1 ? '' : 's'}</div>{workspaceChanges.length ? workspaceChanges.map((change) => <button key={change.name} className="search-result" onClick={() => { if (files.some((file) => file.name === change.name)) { setActiveName(change.name); setActivePanel('Explorer'); } }}><span className="search-result-title"><FileCode2 size={14} />{change.name}</span><span className={'change-kind change-' + change.kind}>{change.kind}</span></button>) : <p>No local edits since this workspace was opened.</p>}</div> : activePanel === 'Settings' ? <div className="account-panel settings-panel"><strong>Editor preferences</strong><p>Changes apply immediately and are saved in this browser.</p><label>Font size<select value={editorSettings.fontSize} onChange={(event) => setEditorSettings((current) => ({ ...current, fontSize: Number(event.target.value) }))}><option value={12}>12 px</option><option value={13}>13 px</option><option value={14}>14 px</option><option value={15}>15 px</option><option value={16}>16 px</option><option value={18}>18 px</option><option value={20}>20 px</option></select></label><label>Word wrap<select value={editorSettings.wordWrap} onChange={(event) => setEditorSettings((current) => ({ ...current, wordWrap: event.target.value }))}><option value="on">On</option><option value="off">Off</option></select></label><label className="setting-toggle"><input type="checkbox" checked={editorSettings.minimapEnabled} onChange={(event) => setEditorSettings((current) => ({ ...current, minimapEnabled: event.target.checked }))} /> Show code minimap</label><button className="auth-button secondary" onClick={() => setEditorSettings({ fontSize: 13, wordWrap: 'on', minimapEnabled: false })}>Reset preferences</button></div> : activePanel === 'Account' ? <div className="account-panel">{authUser ? <><strong>Signed in</strong><p>{authUser.email}</p><button className="auth-button secondary" onClick={handleSignOut}>Sign out</button></> : <><strong>{authMode === 'signup' ? 'Create your account' : 'Sign in to SYNTAX'}</strong><p>{supabaseConfigured ? 'Use your email to access your account.' : 'Authentication UI is ready. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in hosting settings to activate sign-in.'}</p><form onSubmit={handleAuth}><label>Email<input type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={6} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 6 characters" /></label><button className="auth-button" type="submit" disabled={authBusy || !supabaseConfigured}>{authBusy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button></form><button className="auth-mode-switch" onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}>{authMode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</button></>}</div> : <div className="empty-panel"><WandSparkles size={22} /><strong>{activePanel}</strong><p>This tool is scaffolded for a future full-stack integration.</p></div>}
        </aside>
        <section className="workbench">
          <div className="tabs">{files.map((file) => <button key={file.name} className={activeName === file.name ? 'tab selected' : 'tab'} onClick={() => setActiveName(file.name)}><FileCode2 size={14} /><span>{file.name}</span>{activeName === file.name && <span className="tab-dot" />}</button>)}<div className="tabs-spacer" /><button className="run-button" onClick={() => setPreviewOpen((open) => !open)}>{previewOpen ? <Code2 size={14} /> : <Eye size={14} />}{previewOpen ? 'Editor' : 'Preview'}</button><button className="run-button" onClick={() => { setTerminalOpen(true); setTerminalText((current) => current + '\nBuild/run requested. Browser preview is available; shell execution still requires an isolated runtime.\n'); }}><Play size={14} /> Run</button></div>
          <div className="breadcrumb"><span>SYNTAX-WORKSPACE</span><ChevronRight size={13} /><span>{activeFile.name}</span><span className="breadcrumb-language">{languageNames[activeFile.language] ?? activeFile.language}</span></div>
          <div className={previewOpen ? 'editor-area preview-area' : 'editor-area'}>{previewOpen ? <iframe ref={previewFrameRef} title="SYNTAX web project preview" sandbox="allow-scripts" srcDoc={previewDocument} /> : <MonacoCodeEditor value={activeFile.content} language={activeFile.language} onChange={updateContent} fontSize={editorSettings.fontSize} wordWrap={editorSettings.wordWrap} minimapEnabled={editorSettings.minimapEnabled} />}</div>
          {terminalOpen && <section className="terminal"><div className="terminal-heading"><div><button className="terminal-tab selected"><Terminal size={14} /> TERMINAL</button><button className="terminal-tab" onClick={() => setTerminalText('Output panel is ready for a connected build runner.\n')}>OUTPUT</button></div><button onClick={() => setTerminalOpen(false)} title="Close terminal"><X size={15} /></button></div><pre>{terminalText}</pre><form onSubmit={runCommand} className="terminal-input"><span>$</span><input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Type a command (preview only)" aria-label="Terminal command" /><button type="submit">Send</button></form></section>}
          <footer className="statusbar"><span><GitBranch size={13} /> workspace*</span><span>UTF-8</span><span>{languageNames[activeFile.language] ?? activeFile.language}</span><span className="status-spacer" /><span><ShieldCheck size={13} /> {saveState}</span><span><Command size={13} /> SYNTAX</span></footer>
        </section>
      </div>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
    </main>
  );
}
