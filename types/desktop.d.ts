export {};

declare global {
  interface Window {
    syntaxDesktop?: {
      chooseProjectFolder: () => Promise<{ path: string } | null>;
      readProjectFiles: (root: string) => Promise<{ files: Array<{ name: string; language: string; value: string }> }>;
      writeProjectFiles: (root: string, files: Array<{ name: string; value: string }>) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}
