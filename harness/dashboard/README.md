# Local dashboard

Configure and build the two native test binaries before starting the dashboard:

```sh
cmake -S harness -B build/layout-animation-harness -G Ninja
cmake --build build/layout-animation-harness --target harness_ios_tests harness_android_tests --parallel
```

Then start the dashboard with the same build directory:

```sh
node harness/dashboard/server.mjs --build build/layout-animation-harness
```

Open `http://127.0.0.1:4173`. The server binds only to localhost. It can rebuild both native targets, run one test or the complete suite, and replay the mounted host-tree state from every transaction. Traces are temporary and are not part of CI output.

The server exits with the missing build command when either test binary is absent instead of showing an empty suite.

Each test runs in its own native process. The dashboard distinguishes assertion failures, crash signals, and timeouts. `LayoutAnimationCrashRegressionTest` means the historical broken implementation crashed; a correct build still passes the test.

Each native test declares a short technical description and applicable Reanimated GitHub numbers beside its test body. The dashboard reads that registry from the binary, displays it above the replay, and includes it in search results. The binaries reject tests with missing metadata or descriptions shorter than two sentences.

The dashboard interaction check can run independently of the native build:

```sh
node --test harness/dashboard/app.test.mjs
```

Point `--build` at a build configured against another Reanimated checkout to inspect that branch's conditional tests and behavior.

The canvas and view hierarchy share one selection. A selected tag stays selected as frames advance, including frames where it is not mounted, so its full lifecycle can be followed in either direction. View details distinguish local and absolute origins, local and effective opacity, and the mounted display type. Update mutations show opacity changes directly and expose before/after geometry on hover.

Use the frame number for exact jumps in long traces, the range control for scrubbing, and Play for continuous replay. Left and right arrow keys step frames and Space toggles playback when focus is outside a control. In the view hierarchy, Up, Down, Home, and End move between rows.
