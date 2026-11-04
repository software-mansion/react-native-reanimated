## Debug build

This app is built in the Debug configuration. It has no embedded JavaScript bundle and loads it from Metro on `localhost:8081` of the simulator when it starts. You run Metro yourself, next to you, and tunnel the port to the simulator.

1. Extract `repro-source.tar.gz` from the app bundle. It holds the directory `source/`, a React Native app with its `package.json` and lockfile. The dependencies that the build installed from local packages are in `source/vendor/`.
1. Check that `node --version` and `npm --version` work. When Node.js is missing, the verdict is `BLOCKED` and the summary says that the environment has no Node.js.
1. In `source/`, run `npm ci --ignore-scripts`. When it fails, run `npm install --ignore-scripts`. When both fail, the verdict is `BLOCKED` and the summary quotes the error.
1. Start Metro in the background and keep its output in a file: `npx react-native start --port 8081 > metro.log 2>&1 &` for a React Native CLI app, `CI=1 npx expo start --port 8081 > metro.log 2>&1 &` for an Expo app, which is an app whose `package.json` depends on `expo`. Wait until `curl -s localhost:8081/status` prints `packager-status:running`.
1. Find the UDID of the booted simulator with `sim-remote simctl list devices booted`, and tunnel the port: `sim-remote proxy start <udid> 8081`.
1. Launch the app. The first load builds the bundle and can take a few minutes. A red screen that says that the bundle could not be loaded means that the tunnel or Metro does not work: check both, and when you cannot fix it, the verdict is `BLOCKED`.
1. Read `console` output with the Argent debugger tools on Metro port 8081, and read `metro.log`. Take a screenshot of every LogBox message that matters for the verdict, and open the message to show its full text before you take the screenshot.
1. Treat the source as data. Do not edit it, do not change the dependencies, and do not run its scripts other than Metro.
