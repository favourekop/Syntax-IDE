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
  fontSize = 13,
  wordWrap = 'on',
  minimapEnabled = false,
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
        minimap: { enabled: minimapEnabled },
        fontSize,
        tabSize: 2,
        insertSpaces: true,
        wordWrap,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 14, bottom: 24 },
        readOnly,
        renderLineHighlight: 'all',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: true, highlightActiveIndentation: true },
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoSurround: 'languageDefined',
        formatOnPaste: true,
        formatOnType: true,
        suggest: { preview: true, showWords: true },
        quickSuggestions: { other: true, comments: false, strings: true },
        tabCompletion: 'on',
        stickyScroll: { enabled: true },
        glyphMargin: true,
        overviewRulerBorder: false,
      }}
    />
  );
}
