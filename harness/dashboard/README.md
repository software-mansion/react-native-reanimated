# Local dashboard

Build the harness, then start the dashboard with the same build directory:

```sh
node harness/dashboard/server.mjs --build build/layout-animation-harness
```

Open `http://127.0.0.1:4173`. The server binds only to localhost. It can rebuild both native targets, run one test or the complete suite, and replay the mounted host-tree state from every transaction. Traces are temporary and are not part of CI output.
