# SYNTAX IDE desktop architecture

## Product split
- The SYNTAX IDE desktop application is the public product distributed through signed Windows installers.
- Projects opened by a user remain on that user's computer by default.
- The built-in web preview runs locally inside the desktop application and is not a public deployment.
- Publishing a user's project to the internet must always be an explicit, separately authorized action.

## Initial target
- Windows 10/11, x64 installer (NSIS).
- macOS and Linux packaging are later release targets.

## Stack
- Next.js App Router + React + TypeScript for the desktop UI.
- Electron main process for the native desktop window and OS integration.
- Context-isolated preload bridge; renderer has no Node.js integration.
- Monaco Editor for code editing.
- Supabase is optional for account identity, sync, and cloud project metadata. Local projects must remain usable without an account.

## Local project security
- The renderer calls a narrow preload API; it never receives direct Node.js or filesystem access.
- The main process validates filenames and supported file types.
- User code must run in a separate child process or isolated runtime, never inside the Electron main process.
- Local preview must bind to loopback only and must not expose a public network endpoint.
- Do not execute arbitrary terminal commands until process lifecycle, working-directory validation, environment isolation, and user consent are implemented.

## Packaging
- Next.js builds with standalone output.
- Electron starts the packaged standalone server on 127.0.0.1:3210.
- Electron Builder produces a Windows x64 NSIS installer.
- Release signing and auto-update configuration are separate release-readiness tasks.
