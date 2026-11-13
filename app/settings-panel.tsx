"use client";

import { useEffect, useState } from "react";
import { X, Keyboard, Monitor, Code2, Terminal, RotateCcw } from "lucide-react";

export type EditorPreferences = {
  fontSize: number;
  tabSize: number;
  lineNumbers: "on" | "off";
  cursorStyle: "line" | "block" | "underline";
  minimap: boolean;
  wordWrap: "on" | "off";
  autosave: boolean;
  autosaveDelay: number;
  theme: "syntax-dark" | "light" | "high-contrast";
  previewCommand: string;
  keybindings: Record<string, string>;
};

const defaults: EditorPreferences = {
  fontSize: 14,
  tabSize: 2,
  lineNumbers: "on",
  cursorStyle: "line",
  minimap: true,
  wordWrap: "off",
  autosave: false,
  autosaveDelay: 1200,
  theme: "syntax-dark",
  previewCommand: "",
  keybindings: {
    save: "Ctrl+S",
    openFolder: "Ctrl+O",
    toggleTerminal: "Ctrl+`",
    startPreview: "Ctrl+Shift+P",
    openSettings: "Ctrl+,",
    runCommand: "Ctrl+Enter"
  }
};

export function loadPreferences(): EditorPreferences {
  if (typeof window === "undefined") return defaults;
  try {
    const stored = JSON.parse(localStorage.getItem("syntax.preferences") || "{}");
    return { ...defaults, ...stored, keybindings: { ...defaults.keybindings, ...(stored.keybindings || {}) } };
  } catch { return defaults; }
}

export function SettingsPanel({ onClose, onChange }: {
  onClose: () => void;
  onChange: (preferences: EditorPreferences) => void;
}) {
  const [prefs, setPrefs] = useState<EditorPreferences>(loadPreferences);
  const [capture, setCapture] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!capture) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") { setCapture(null); return; }
      const parts = [];
      if (event.ctrlKey) parts.push("Ctrl");
      if (event.altKey) parts.push("Alt");
      if (event.shiftKey) parts.push("Shift");
      if (event.metaKey) parts.push("Ctrl");
      if (!["Control", "Alt", "Shift", "Meta"].includes(event.key)) parts.push(event.key.length === 1 ? event.key.toUpperCase() : event.key);
      if (parts.length > 0 && !["Ctrl", "Alt", "Shift", "Meta"].includes(parts[parts.length - 1])) {
        const next = { ...prefs, keybindings: { ...prefs.keybindings, [capture]: parts.join("+") } };
        setPrefs(next);
        localStorage.setItem("syntax.preferences", JSON.stringify(next));
        onChange(next);
        setCapture(null);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [capture, prefs, onChange]);

  function update<K extends keyof EditorPreferences>(key: K, value: EditorPreferences[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem("syntax.preferences", JSON.stringify(next));
    onChange(next);
  }

  function reset() {
    setPrefs(defaults);
    localStorage.setItem("syntax.preferences", JSON.stringify(defaults));
    onChange(defaults);
    setCapture(null);
  }

  const duplicates = Object.entries(prefs.keybindings).reduce<Record<string, string[]>>((all, [action, binding]) => { all[binding] = [...(all[binding] || []), action]; return all; }, {});
  const conflicts = Object.entries(duplicates).filter(([, actions]) => actions.length > 1);

  const shortcuts = [
    ["save", "Save project"], ["openFolder", "Open project folder"],
    ["toggleTerminal", "Toggle terminal"], ["startPreview", "Start local preview"],
    ["openSettings", "Open settings"], ["runCommand", "Run terminal command"]
  ] as const;

  return <div className="settingsBackdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="settingsDialog" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
      <header><div><small>SYNTAX IDE</small><h2 id="settingsTitle">Settings</h2></div><button onClick={onClose} aria-label="Close settings"><X size={18}/></button></header>
      <div className="settingsBody">
        <section className="settingsSection"><h3><Code2 size={15}/> Editor</h3>
          <label>Font size <strong>{prefs.fontSize}px</strong><input type="range" min="11" max="24" value={prefs.fontSize} onChange={e => update("fontSize", Number(e.target.value))}/></label>
          <label>Tab size <select value={prefs.tabSize} onChange={e => update("tabSize", Number(e.target.value))}><option value={2}>2 spaces</option><option value={4}>4 spaces</option><option value={8}>8 spaces</option></select></label>
          <label>Line numbers <select value={prefs.lineNumbers} onChange={e => update("lineNumbers", e.target.value as EditorPreferences["lineNumbers"])}><option value="on">On</option><option value="off">Off</option></select></label>
          <label>Cursor style <select value={prefs.cursorStyle} onChange={e => update("cursorStyle", e.target.value as EditorPreferences["cursorStyle"])}><option value="line">Line</option><option value="block">Block</option><option value="underline">Underline</option></select></label>
          <label className="settingToggle">Show minimap <input type="checkbox" checked={prefs.minimap} onChange={e => update("minimap", e.target.checked)}/></label>
          <label>Word wrap <select value={prefs.wordWrap} onChange={e => update("wordWrap", e.target.value as EditorPreferences["wordWrap"])}><option value="off">Off</option><option value="on">On</option></select></label>
          <label>Colour theme <select value={prefs.theme} onChange={e => update("theme", e.target.value as EditorPreferences["theme"])}><option value="syntax-dark">SYNTAX Dark</option><option value="light">Light</option><option value="high-contrast">High contrast</option></select></label>
          <label className="settingToggle">Autosave project files <input type="checkbox" checked={prefs.autosave} onChange={e => update("autosave", e.target.checked)}/></label>
          <label>Autosave delay <strong>{prefs.autosaveDelay} ms</strong><input type="range" min="500" max="5000" step="100" value={prefs.autosaveDelay} onChange={e => update("autosaveDelay", Number(e.target.value))}/></label>
        </section>
        <section className="settingsSection"><h3><Monitor size={15}/> Local preview</h3><label>Development command<input className="settingText" value={prefs.previewCommand} onChange={e => update("previewCommand", e.target.value)} placeholder="Auto-detect from package.json (or enter a command)"/></label><p>Runs on this computer and binds to loopback. Preview is never published automatically.</p></section>
        <section className="settingsSection"><h3><Keyboard size={15}/> Keyboard shortcuts</h3>{shortcuts.map(([key, label]) => <div className="shortcutRow" key={key}><span>{label}</span><button onClick={() => setCapture(key)}>{capture === key ? "Press keys…" : prefs.keybindings[key]}</button></div>)}<p>Choose a shortcut, then press the key combination. Press Escape to cancel.</p>{conflicts.length > 0 && <p className="shortcutWarning">Shortcut conflicts: {conflicts.map(([binding, actions]) => binding + " (" + actions.join(", ") + ")").join("; ")}. Assign unique combinations before relying on these shortcuts.</p>}</section>
        <section className="settingsSection"><h3><Terminal size={15}/> Workspace</h3><p>Project files remain on your computer. IDE preferences are stored locally on this device.</p></section>
      </div>
      <footer><button onClick={reset}><RotateCcw size={14}/> Reset defaults</button><button className="settingsDone" onClick={onClose}>Done</button></footer>
    </section>
  </div>;
}
