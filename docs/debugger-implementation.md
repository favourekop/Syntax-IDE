# SYNTAX IDE debugger implementation plan

## Debugger contract

The debugger must be a real runtime debugger, not a mock panel. The first supported target is Node.js JavaScript/TypeScript projects on Windows 10/11. The architecture uses the Debug Adapter Protocol (DAP) between the workbench and a local adapter, with Node's inspector protocol behind the adapter.

## First release scope

- Launch a selected Node entry point with the inspector bound only to 127.0.0.1 on an ephemeral local port.
- Discover the inspector WebSocket endpoint from the local process metadata endpoint.
- Map Monaco editor breakpoints to source URLs and report verified/unverified states.
- Support continue, pause, step over, step into, step out, and stop.
- Show call stack, scopes, variables, and runtime console output.
- Keep all debug traffic on loopback; never expose the inspector port to a network interface.
- Stop the debug process and its child processes when the user ends the session or exits SYNTAX IDE.

## Security and correctness

- Never bind Node inspector to 0.0.0.0.
- Validate the selected entry point is inside the active project root.
- Do not evaluate arbitrary debugger expressions automatically; evaluation must be a direct user action.
- Handle source maps for TypeScript and bundled applications before claiming source-level breakpoint support.
- Treat browser debugging as a separate later target using Chromium DevTools Protocol.

## Acceptance tests

1. Launch a small Node fixture and verify the inspector endpoint is loopback-only.
2. Set a line breakpoint and verify the runtime pauses on the expected source line.
3. Inspect local and closure variables while paused.
4. Step through, resume, and stop without orphaning processes.
5. Verify malformed paths and external source URLs are rejected.
6. Run the tests on Windows CI before enabling the Debug controls in the stable release.

The Debug UI must remain clearly marked as in development until these tests pass.
