# Testing Guide for Every Objective

This document defines the common setup behind each objective's stage-specific
test procedure. The objective file tells you **what to run and what must be
true**; this guide tells you **how to launch, compare, capture, and classify**
the result.

For autonomous post-objective bench capture, follow
[AGENT-BENCH-TESTING-RUNBOOK.md](AGENT-BENCH-TESTING-RUNBOOK.md).

## Test levels

Use the cheapest level that can prove the contract, then add the next level
when the objective crosses that boundary.

| Level | Use it for | Do not use it to prove |
| --- | --- | --- |
| Pure unit test | IR validation, capability routing, curves, state machines | UIKit/Fabric ordering |
| iOS Simulator | lifecycle, view lookup, callbacks, cancellation, visual correctness | production performance or 120 Hz behavior |
| Physical iOS device | compositor timing, frame pacing, memory, sustained stress | Android portability |
| Android emulator/device | common-plan portability and Android lifecycle | iOS Core Animation behavior |

Simulator success is never performance evidence. A physical device run is
mandatory only when an objective explicitly says so.

## One-time FabricExample setup

From the repository root:

```sh
yarn install
cd apps/fabric-example
yarn install
cd ios
bundle install
bundle exec pod install
```

Open `apps/fabric-example/ios/FabricExample.xcworkspace`, not the `.xcodeproj`,
when building through Xcode. CocoaPods creates the workspace.

## Start an iOS Simulator run

1. In Terminal A, start Metro:

   ```sh
   cd apps/fabric-example
   yarn start
   ```

2. Boot the simulator with UDID **0BF2326C-C973-40EB-8B19-151A01735B78** from
   Xcode's **Window > Devices and Simulators**, or inspect available devices
   with:

   ```sh
   xcrun simctl list devices available
   ```

3. In Terminal B, build and launch on the already-booted simulator:

   ```sh
   cd apps/fabric-example
   yarn ios --scheme "Debug FabricExample" --simulator "0BF2326C-C973-40EB-8B19-151A01735B78"
   ```

   Keep Metro running, and wait for the CLI build, install, and launch to
   complete before opening the test bench. A previously visible app screen is
   not proof that the newly selected static feature flags were compiled.

4. In FabricExample, search for and open **[LA] Native backend test bench**.
   The Objective 01 screen and tracing instrumentation are already implemented.

For Objective-C++, C++, Pod configuration, or static-feature-flag changes,
stop the app and rebuild it. A Metro reload is insufficient.

## Baseline capture point

The first durable baseline was not captured before Objective 02 was
implemented. Thus, each initial `legacy` and `native` artifact must be
recorded from a commit that includes completed Objective 02 and tagged
`capturePoint: post-objective-02`. Do not call these artifacts
`pre-objective-02`, and do not use them to claim a measured Objective 02
before/after improvement. The legacy backend remains the behavioral oracle;
the capture point describes the code state of the repository and native PoC.

## Compare legacy and native backends

`IOS_USE_NATIVE_LAYOUT_ANIMATIONS` is a static Reanimated feature flag in
`apps/fabric-example/package.json`. It is compiled into the native app; it is
not a runtime toggle.

For each required comparison:

1. Set `IOS_USE_NATIVE_LAYOUT_ANIMATIONS` to `false`.
2. Regenerate the Pods configuration and rebuild:

   ```sh
   cd apps/fabric-example/ios
   bundle exec pod install
   cd ..
   yarn ios --scheme "Debug FabricExample" --simulator "0BF2326C-C973-40EB-8B19-151A01735B78"
   ```

3. Run the scenario three times and export its trace as `legacy`.
4. Set the flag to `true`, repeat `pod install` and the native rebuild, then
   run the identical scenario three times and export its trace as `native`.
5. Restore the flag value expected by the branch before committing.

Never describe a visual difference as a regression until the traces establish
that both runs used the same scenario inputs and timing.

## Required test-bench controls and output

Objective 01's development-only test bench should expose:

- scenario selector;
- deterministic **Reset**, **Run uninterrupted**, **Run + interrupt**, and
  **Run + cancel** controls; each run control starts a complete mode, and the
  latter two schedule their action automatically rather than modifying an
  already-running **Run uninterrupted** mode;
- fixed-duration and repetition-count fields;
- a visible compiled-backend label (`legacy` or `native`);
- event trace export/copy;
- callback count and last `finished` value;
- model/presentation values requested by the current objective;
- a visible PASS/FAIL assertion summary where an assertion is automatable.

Each later objective may add a scenario or assertion, but should not invent a
second manual harness.

## Capture reproducible evidence

Take a screenshot:

```sh
xcrun simctl io booted screenshot /tmp/native-layout-animation.png
```

Record video, then press Control-C after the scenario finishes:

```sh
xcrun simctl io booted recordVideo /tmp/native-layout-animation.mp4
```

For every comparison save:

- commit SHA and backend flag;
- capture point (`post-objective-02` for the initial corpus, then the objective
  or candidate identifier for later measurements);
- simulator/device model and OS version;
- scenario name and inputs;
- structured trace;
- screenshot or video when the contract is visual;
- pass/fail plus a link to the issue for any known failure.

Do not commit `/tmp` captures. Attach them to the PR or copy durable textual
goldens into the test-fixture directory chosen in Objective 01.

## AddressSanitizer run

Use this for native lifetime, use-after-free, and stale-callback work:

1. Open `apps/fabric-example/ios/FabricExample.xcworkspace` in Xcode.
2. Select the **Debug FabricExample** scheme and an iPhone simulator.
3. Choose **Product > Scheme > Edit Scheme > Run > Diagnostics**.
4. Enable **Address Sanitizer**.
5. Run the named stress scenario for the repetition count in the objective.
6. The test passes only if the Xcode issue navigator and console report no
   sanitizer error. Disable the sanitizer before performance measurement.

## Reduced-motion run

On the simulator or device, open **Settings > Accessibility > Motion > Reduce
Motion**. Run once with it off and once with it on. Record the backend label,
callback result, and whether the view reaches the same committed final state.

## Physical iOS device run

1. Connect a supported iPhone, select it in Xcode, and run the **Debug
   FabricExample** scheme once to establish signing.
2. For performance objectives, use a Release build and disable sanitizers,
   screen recording, the Xcode view debugger, and Simulator slow animations.
3. Run the exact benchmark scenario and repetition count from the objective.
4. Capture Instruments or signpost output, device model, OS, refresh-rate
   capability, and thermal state.

## Android run

**Not active in the current project phase.** Do not run Android builds,
emulators, devices, or tests for current native-layout-animation objectives.
The commands below are reserved for the future Android portability objective
after that work is explicitly started.

Start Metro as above, boot an emulator or attach a device, then run:

```sh
cd apps/fabric-example
yarn android
```

Verify the device is visible before launching:

```sh
adb devices
```

Use a physical Android device for performance claims. Emulator runs are
appropriate for compile, lifecycle, routing, and correctness checks.

## Repository checks

Run the smallest checks affected by the change:

```sh
yarn workspace common-app type:check:native
yarn workspace fabric-example lint
yarn workspace react-native-reanimated test --runInBand
```

For native code also run the relevant repository lint target:

```sh
yarn workspace react-native-reanimated lint:apple
yarn workspace react-native-reanimated lint:android
```

The full native lint targets can be slow and need platform toolchains. A PR
that cannot run one locally must say so and link the CI result; it must not
silently mark the check as passed.

## Result classification

Every failed comparison must end in exactly one category:

1. implementation bug — fix before accepting the objective;
2. accepted difference — maintainer-approved and recorded in
   [DECISION-LOG.md](DECISION-LOG.md);
3. unsupported case — capability router rejects it before native start and the
   legacy backend executes it;
4. flaky or invalid test — repair the test and rerun it; do not use this as a
   product-behavior category.
