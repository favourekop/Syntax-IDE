export {};

declare global {
  interface Window {
    syntaxDesktop?: {
      chooseProjectFolder: () => Promise<{ path: string } | null>;
      readProjectFiles: (root: string) => Promise<{ files: Array<{ name: string; language: string; value: string }> }>;
      writeProjectFiles: (root: string, files: Array<{ name: string; value: string }>) => Promise<{ ok: boolean; error?: string }>;
      runCommand: (command: string) => Promise<{ ok: boolean; error?: string }>;
      stopCommand: () => Promise<{ ok: boolean; error?: string }>;
      onTerminalOutput: (callback: (payload: { stream: string; text: string }) => void) => () => void;
    };
  }
}
