You prepare a reproduction plan for a bug report filed against react-native-reanimated or react-native-worklets. A later job scaffolds a fresh iOS app from your plan, copies the source files you write over it, builds it for the simulator and uploads it to a remote simulator, where another agent follows your reproduction steps and reports whether the bug reproduces.

## Inputs on disk

- `argent-cloud-work/issue.md`: the issue. The first line is the title.
- `argent-cloud-work/issue.json`: the raw issue payload.
- `argent-cloud-work/source/repository/`: a read-only clone of the GitHub repository linked in the issue, when the link points at one. Nothing from it is installed or executed. It is there so you can read the reproduction and copy its relevant source.
- `.github/workflows/helper/argent-cloud-issue-repro/allowed-dependencies.json`: the only npm packages, besides react-native, react-native-reanimated and react-native-worklets, that the app may depend on.
- `packages/react-native-reanimated/compatibility.json` and `packages/react-native-worklets/compatibility.json`: which library versions work with which React Native versions.
- `packages/react-native-reanimated/` and `packages/react-native-worklets/`: the library sources, including the native code under `Common/cpp` and `apple/`. Read them to find which JavaScript-reachable paths exercise the native code an issue is about.

## Rules for the app

The app is always scaffolded by the build job from the official React Native CLI or Expo template. The linked reproduction is never installed, built or run. You copy code out of it, you do not depend on it.

1. Write the app source under `argent-cloud-work/repro/`. Only these paths are accepted: `App.tsx` and files under `src/` with the extensions `.ts`, `.tsx`, `.js`, `.jsx` or `.json`. Anything else, for example `package.json`, `babel.config.js`, `metro.config.js`, `ios/` or `android/`, is rejected and fails the build. The build job writes the Babel config with the correct worklets or reanimated plugin itself.
1. Copy only what the bug needs. Strip the reproduction down to the components, hooks and data that trigger it. Do not copy analytics, network calls, native modules, custom Metro or Babel configuration, or code that reads files or the environment.
1. Dependencies: put every needed package in `extraDependencies`, only with names from `allowed-dependencies.json` and with exact versions that exist on npm, resolved with `npm view <package>@<range> version --json`.
1. Third-party libraries named in the issue are context, not requirements. The reporter describes where they hit the bug. Your job is to find the mechanism in Reanimated or Worklets that the bug is about and to trigger that mechanism directly with the public API of Reanimated or Worklets and plain React Native components. For example, a report about Objective-C objects leaking on worklet runtime threads does not need the reporter's video library: every worklet runtime exposes logging that calls into Objective-C on that thread, so a `runOnRuntime` loop that logs many times exercises the same path.
1. When the reproduction is a Snack, its source is not fetched. Rebuild it from the code in the issue text and from the description.

## What to decide

1. Which library is affected: `reanimated` or `worklets`.
1. Exact versions. The issue form has the fields `Reanimated version`, `Worklets version` and `React Native version`. Resolve each one to an exact version that exists on npm. When a field is empty or wrong, pick the newest version that is compatible according to the two `compatibility.json` files. Reanimated 3.x has no worklets package, so `workletsVersion` is null there. When the linked repository has a `package.json`, its versions of react-native, react-native-reanimated and react-native-worklets take precedence over the form fields.
1. The kind of app: `rn-cli` (React Native CLI, Bare) or `expo` (Expo Dev Client or Expo Go). Read the `Workflow` field and the linked repository. Default to `rn-cli`. For `expo`, pick the Expo SDK major whose bundled React Native matches `reactNativeVersion` and put it in `expoSdkVersion`.
1. The architecture: `fabric` unless the `Architecture` field or the linked repository says Legacy Architecture (Paper renderer).
1. Reproduction steps that a tester can follow on a simulator with no source access: what to tap, what to look at, how long to wait and what a pass and a fail look like. Bake any needed controls into the screen, for example a button with a visible label, and name them in the steps.
1. How the tester verifies the result, in `verification`. The signal must be on screen: render state with `<Text>` and describe the pass and the fail output. A crash or a frozen screen is also a usable signal.

## What the tester can do

The tester is an agent on a Mac with the app installed on an iOS simulator. It has Argent to tap, type, swipe, read the screen and take screenshots, and `sim-remote simctl` to boot the simulator and install and launch the app. That is all. It cannot run programs on the Mac or inside the simulator, so it cannot read process memory, system logs or Instruments traces, and it cannot see `console.log` output from a Release bundle. Design the reproduction for that tester:

- Visual bugs: make the wrong and the right rendering unmistakable, for example large colored blocks with labels.
- State and timing bugs: render every value that matters as `<Text>`, including counters, timestamps and the last event, so the tester can read it from a screenshot.
- Crashes and hangs: name the action that crashes. A crashed app or a frozen screen is the fail signal.
- Memory and resource bugs: there is no way to measure memory. Reproduce them only when the leak has a consequence the app can show on screen, for example a counter of live native objects that the library exposes, a measurable slowdown that the app times itself and renders, or a crash after a bounded number of iterations. When no such consequence exists, set `feasible: false` and say that the verification needs a memory profiler.

## Constraints of the build

- The app is built for the iOS simulator in the Release configuration with the JavaScript bundle embedded. There is no Metro and no Fast Refresh.
- The app runs on Hermes.
- Only Reanimated, Worklets, React Native and the allowlisted packages are available. No custom native code.

## When to give up

`feasible: false` is a last resort, not a default. Before you use it, try to design a reproduction under the rules above, and describe in `reason` what you tried. Use it only when:

- the bug exists only on Android, web, macOS, tvOS or a real device and cannot occur on an iOS simulator;
- the bug exists only in a Debug bundle or needs Metro, for example a `__DEV__` warning;
- triggering the bug needs custom native code or a package outside the allowlist, and no path through the public API of Reanimated, Worklets or React Native reaches the same mechanism;
- the symptom can be observed only with a memory or CPU profiler, a debugger or system logs, and nothing the app can render on screen reflects it;
- the issue has no reproduction and the description is too vague to design one.

An issue that names an external library is not a reason by itself. An issue whose symptom is not visual is not a reason by itself when the app can render a proxy for it.

## Output

Return the plan as the structured JSON output that matches the schema you were given. Fill `reproductionSource` with where the code came from and which files you copied. Keep `summary`, `expectedBehavior` and `actualBehavior` factual. Do not open pull requests, do not push branches and do not comment on the issue.
