export {};

declare global {
  interface Window {
    syntaxDesktop?: {
      chooseProjectFolder: () => Promise<{ path: string } | null>;
      readProjectFiles: (root: string) => Promise<{ files: Array<{ name: string; language: string; value: string }> }>;
      writeProjectFiles: (root: string, files: Array<{ name: string; value: string }>) => Promise<{ ok: boolean; error?: string }>;
      runCommand: (command: string) => Promise<{ ok: boolean; error?: string }>;
      startPreview: (command: string) => Promise<{ ok: boolean; error?: string; url?: string }>;
      stopPreview: () => Promise<{ ok: boolean; error?: string }>;
      onPreviewStopped: (callback: () => void) => () => void;
      stopCommand: () => Promise<{ ok: boolean; error?: string }>;
      onTerminalOutput: (callback: (payload: { stream: string; text: string }) => void) => () => void;
      startDebug: (entry: string) => Promise<{ ok: boolean; error?: string }>;
      setDebugBreakpoint: (file: string, line: number, enabled?: boolean) => Promise<{ ok: boolean; error?: string; breakpointId?: string }>;
      debugAction: (action: "continue" | "pause" | "stepOver" | "stepInto" | "stepOut" | "stop") => Promise<{ ok: boolean; error?: string }>;
      debugProperties: (objectId: string) => Promise<{ ok: boolean; error?: string; properties?: Array<{ name: string; value: string | number | boolean; type?: string; objectId?: string }> }>;
      debugEvaluate: (expression: string, callFrameId?: string) => Promise<{ ok: boolean; error?: string; value?: string | number | boolean }>;
      onDebugEvent: (callback: (payload: { type: string; [key: string]: unknown }) => void) => () => void;
    };
  }
}
