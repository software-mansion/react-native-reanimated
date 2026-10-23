## Debug build

This app is `FabricExample` from `apps/fabric-example` of https://github.com/software-mansion/react-native-reanimated, built at commit `{{COMMIT}}` in the Debug configuration. It has no embedded JavaScript bundle and loads it from Metro on `localhost:8081` of the simulator when it starts. You run Metro yourself, next to you, and tunnel the port to the simulator.

1. Check that `node --version` works. When Node.js is missing, stop and say in the summary that the environment has no Node.js.
1. Clone the repository at that commit: `git init reanimated && cd reanimated && git fetch --depth 1 https://github.com/software-mansion/react-native-reanimated.git {{COMMIT}} && git checkout FETCH_HEAD`.
1. Enable Yarn with `corepack enable`, then run `YARN_ENABLE_SCRIPTS=0 yarn install --immutable` in the root of the clone. It is a Yarn 4 monorepo.
1. Start Metro in the background and keep its output in a file: `yarn workspace fabric-example start --port 8081 > metro.log 2>&1 &`. Wait until `curl -s localhost:8081/status` prints `packager-status:running`.
1. Find the UDID of the booted simulator with `sim-remote simctl list devices booted`, and tunnel the port: `sim-remote proxy start <udid> 8081`.
1. Launch the app. The first load builds the bundle and can take a few minutes. A red screen that says that the bundle could not be loaded means that the tunnel or Metro does not work: check both, and when you cannot fix it, say so in the summary.
1. Read `console` output with the Argent debugger tools on Metro port 8081, and read `metro.log`.
1. Do not edit the source and do not run its scripts other than Metro, unless the task tells you to.
