import Editor from '@monaco-editor/react';

/**
 * Monaco-powered editor for SYNTAX IDE.
 * Pass the active file's content and language from App.jsx.
 * This component does not save files by itself; persistence belongs to the workspace layer.
 */
export default function MonacoCodeEditor({
  value = '',
  language = 'javascript',
  onChange,
  readOnly = false,
}) {
  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={language}
      value={value}
      onChange={(nextValue) => onChange?.(nextValue ?? '')}
      options={{
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        wordWrap: 'off',
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        padding: { top: 14, bottom: 24 },
        readOnly,
        renderLineHighlight: 'all',
        overviewRulerBorder: false,
      }}
    />
  );
}
