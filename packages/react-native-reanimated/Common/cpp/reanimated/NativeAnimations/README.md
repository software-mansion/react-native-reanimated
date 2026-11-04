# Native animation host

This directory holds the shared playback boundary of native animations: CSS transitions and layout, entering, and exiting animations play here on the platform animation API (Core Animation on iOS, `ValueAnimator` on Android) instead of on the frame loop of Reanimated. This file is for maintainers. Users read `docs/docs-reanimated/docs/guides/feature-flags.md`.

Paths are relative to `packages/react-native-reanimated`. Each statement names a file and a symbol; read the code there before you change the behavior.

## 1. Domain adapters and shared service duties

- One host for each Reanimated module: `NativeAnimationHost::create` in `apple/reanimated/apple/native/PlatformDepMethodsHolderImpl.mm` and in `android/src/main/cpp/reanimated/android/NativeProxy.cpp`. The app has a host only when one of the four static flags is on (`IOS_CSS_CORE_ANIMATION`, `IOS_LAYOUT_ANIMATIONS_CORE_ANIMATION`, `ANDROID_CSS_PLATFORM_TRANSITIONS`, `ANDROID_NATIVE_LAYOUT_ANIMATIONS`).
- The host (`NativeAnimationHost.h`) owns the records of active commands and tracks, validates a request (`validate`), resolves conflicts between owners (`conflictingTracks`, `hasPriorityOver`), starts and stops platform playback, and gives each command one result. It does no frame-driven work, plays no CSS animation, and has no write-control filter.
- A domain adapter is a `NativeAnimationClient` (`NativeAnimationRequest.h`). It builds the tracks, picks the route before the start, and keeps the domain rules:
  - Layout: `NativeLayoutGroups` (`Common/cpp/reanimated/LayoutAnimations/NativeLayoutGroups.h`) is the client of one surface. `LayoutAnimationsProxy` builds the tracks (`startNativePlayback`) and hands an animation to the frame driver (`continueOnFrameDriver`, `transferToFrameDriver`).
  - CSS: `CSSHostTransitionBackend` (`Common/cpp/reanimated/CSS/core/transition/CSSHostTransitionBackend.cpp`) routes one property of one transition run. The route tables are `apple/reanimated/apple/CSS/REACSSPlatformRouteTable.mm` and `android/src/main/cpp/reanimated/android/CSS/AndroidCSSRouteTable.cpp`.
- The platform (`NativeAnimationPlatform.h`) refuses or realizes a track on a mounted view, plays it, stops it with a stop mode, and reports the physical end. Apple: `CoreAnimationPlatform` in `apple/reanimated/apple/NativeAnimations/REANativeAnimationPlatform.mm`. Android: `AndroidNativeAnimationPlatform` in `android/src/main/cpp/reanimated/android/NativeAnimations/`, which drives the Kotlin `NativeAnimationExecutor` (`android/src/main/java/com/swmansion/reanimated/nativeAnimations/`).
- `USE_LEGACY_LAYOUT_ANIMATIONS_PROXY` gives layout no native route: `LayoutAnimationsProxy_Legacy` has no host. The `LayoutAnimationsProxy` constructor takes the host only when `hasNativeLayoutRouteFlag()` (`NativeLayoutRoute.h`) is true.

## 2. Common values, timing, targets, handles, and claim keys

- `AnimationHandle` (`NativeAnimationIdentity.h`): surface, tag, `AnimationOwner`, generation. A new command takes a new generation; a retired handle is never used again. The layout generation is the build id from the one process-wide counter `makeBuildId` (`LayoutAnimationsProxy.cpp`). The host rejects a handle that it has already with `StaleIdentity` (`admit`).
- `TrackKey` is a handle and an `AnimationTarget`. It is the claim key: a late event of an old command cannot reach its replacement.
- `AnimationTarget` lists the targets. `targetsOverlap`: `Position` overlaps its two axes, `Size` overlaps its two dimensions, every other target overlaps only itself. Layout uses `Opacity`, `PositionX`, `PositionY`, `Width`, `Height`, `Transform` (`leafTarget` in `LayoutAnimations/NativeLayoutTracks.cpp`).
- Values (`NativeAnimationValue.h`): `AnimationValue` (scalar, point, size, color) and `AnimationTransform` (an ordered operation list). A start is an explicit value, `CurrentVisualValue`, or `VisualValueIfInterrupting` (`AnimationStart`). Layout always gives an explicit start; CSS gives `VisualValueIfInterrupting`.
- Timing (`NativeAnimationTiming.h`): `LinearTiming`, `CubicBezierTiming`, `StepsTiming`, `LinearStopsTiming`, `SpringTiming`. Each segment of a timeline has its own timing (`TimelineSegment` in `NativeAnimationTrack.h`).
- `AnimationTrack` (`NativeAnimationTrack.h`): target, body (`ValueTimeline` or `TransformTimelines`, one timeline for each operation), delay, duration, and `EndpointPolicy`:
  - `MountedModelMustMatchEndpoint`: the mounted model already has the end value. Layout entering and layout animations.
  - `ExecutorCommitsEndpoint`: the platform writes the end value to the model before playback. CSS.
  - `HoldWithoutCommit`: the end value stays on screen with no model write until the owner cancels the track. Layout exiting and CSS holds.
- The layout build summary comes from JS: `build` in `src/layoutReanimation/animationsManager.native.ts` (type `LayoutAnimationBuildSummary` in `src/commonTypes.ts`). The leaf form is `summarizeNativeLeaf` (`src/layoutReanimation/nativeLeaves.ts`), the easing fit is `fitEasingCurve` (`src/animation/nativeEasingCurve.ts`), and the spring form is `describeNativeSpring` (`src/animation/nativeTiming.ts`), only inside `SPRING_GATES` (`nativeLeaves.ts`).

## 3. Fallible construction and mounted-target validation

A native start passes a build check and a mounted-target check. A build refusal sends the whole animation to the frame driver. A mounted-target rejection ends the command with `false`.

1. Build, before the mount report: `makeNativeLayoutTracks` (`NativeLayoutTracks.h`) gives the tracks or the first `NativeLayoutRefusal`. `TrackBuildFailure` (`NativeAnimationTrack.h`) is the type of a refusal. The limits are `NativeLayoutLimits` (`LayoutAnimations/NativeLayoutLimits.h`); JS checks them first and names the exceeded limit (`exceededLimit`). The build also checks that the end of each entering or layout track is the value that the mount gives the view (`endsAtMountedValue` in `makeTrack`); a different end is `EndpointMismatch`, and the animation plays on the frame driver. For example `FlipIn*` ends at a transform that the view does not have.
1. Mounted target, in the mount report: `NativeAnimationPlatform::resolve` finds the mounted view, checks each `MountedModelMustMatchEndpoint` end against the mounted model again, and gives a `MountedAnimation` or an `AnimationResultReason`. A rejection here ends the command with `Rejected` and no frame-driven fallback: the layout callback gets `false` one time and the view shows its final state. No production trigger of this rejection is known; the build refuses the known cases first.

`NativeAnimationPlatform::unsupportedTargetCause` is the static check of the platform: it reads the track and the props of the `ShadowView`, no mounted state, so the build calls it (`makeTrack`) and `NativeLayoutGroups::canContinueOn` calls it again for new props during a group. It gives the first `UnsupportedTargetCause` in the order of its clauses. Apple: timing kind and spring form, a size below 0, a size change of a view with no view props (`NotViewKind`), an opacity filter, a size change of a component that is not `View`, a size change whose picture does not follow the bounds (`pictureFollowsBounds`), a transform of a component other than `View`, `Paragraph`, or `Image` (`playsTransform`), a size-dependent transform, edge antialiasing (`hasEdgesOfFrameDriver`). Android: timing kind, target kind, API level (moving geometry needs API 29, `targetCause`), a transform with an operation that is not planar (`isPlanar`), a size track that leaves one pixel of the mounted size (`staysInOnePixelOfMountedSize`), a skew, a singular matrix, or a size-dependent transform in moving geometry (`movingGeometryCause`).

The development trace gives each refusal: `LayoutBuildFailed` with `buildFailure`, and `buildFailureCause` for `UnsupportedTarget` (the clause) and `ResourceLimit` (the limit name). A start that layout refuses before it has a build summary gives `LayoutStartRefused` with `layoutStartRefusal` (`NativeStartRefusal` in `NativeLayoutRoute.h`).

Before the JS build, `startNativePlayback` asks `NativeAnimationHost::playsSizeChange` about the old and new frame. Android refuses a width or height difference over one physical pixel (`AndroidNativeAnimationPlatform::playsSizeChange`); Apple allows it. The refusal is `LayoutStartRefused` with `SizeBeyondOnePixel`. This check uses the frame size, not the values of an entering or exiting builder. The later track check still applies.

The build receives `NativeLayoutPlatformRules` from the host. On Android API 29 and later, `movesOnlyPlanarTransforms` lets JS refuse a moving `rotateX`, `rotateY`, or `perspective` before an easing fit (`hasMovingNonPlanarTransform` in `nativeLeaves.ts`). JS still calls the builder and keeps its result for the frame driver. It returns `refusedTarget: NonPlanarTransform`. Before conversion, `nativeLayoutSummaryRefusal` (`NativeLayoutTracks.cpp`) reads this cause, resource limits, an empty leaf list, initial-only keys, and `jumpsAfterDelay`. A refusal records `LayoutBuildFailed`; it makes no native tracks. The later platform checks still handle forms that this early check cannot classify.

## 4. Routes: direct, structured, sampled, and frame-driven

- Direct: one timing, linear or cubic Bezier, on one track.
- Structured: `withSequence`, `Keyframe`, and transform operations with their own delays, durations, or easings. Each leaf is one track on its declared times; a transform has one timeline for each operation (`TransformTimelines`). The segment sum of one animation has the limit `NativeLayoutLimits::segments`.
- Sampled: there is no sampler. An easing function that is not linear or Bezier is fitted with cubic Bezier pieces (`fitEasingCurve`); a fitted easing is a structured track. A function with no fit at the tolerance of `nativeLeaves.ts` stays frame-driven (`UnsupportedTiming`). The fit of a function object is kept for later builds, so the native route takes an easing function as a pure function of its argument.
- Frame-driven: every refused form, all of the animation. Shared element transitions and progress transitions never take the native route (`startSharedTransition`, `startProgressTransition` in `LayoutAnimationsProxy.cpp` go to the frame driver).
- Admission before the build (`LayoutAnimationsProxy::admitsNativeStart`, `nativeStartRefusal`): the proxy has a host, the light node is mapped, the exit state matches the type, the frame driver has no animation of the view, no shared transition hides the view, and the pull runs in a mount that has a report (`mountReportOfPull`). An entering view must also mount in a window (`admitsNativeEnteringStart`, `mountsInWindow`): each ancestor that the same transaction inserts must be a plain `View` with no `removeClippedSubviews`, and the first older ancestor must be in a window and must not remove clipped subviews. So a view under a new `Modal` or a new `ScrollView` stays frame-driven.
- Android: `mountReportOfPull` gives a report only when React Native pulls on the mount thread (`pullsOnMountThread` in `Compat/ReactNativeFeatureFlagsCompat.h`: `enableMountingCoordinatorPullModelAndroid` and `enableAccumulatedUpdatesInRawPropsAndroid`). In the push model each layout animation is frame-driven.

`recordLayoutRequest` counts Layout requests for each view over the last second (`LayoutRequestRates`, limit `RequestsPerSecond = 20`). From the twentieth request, the view uses the frame driver until the rate drops. This check runs before the native build and records `LayoutStartRefused:RequestRate`. Entering and exiting starts do not use this rate check. An animation whose summarized tracks all have zero duration and at least one positive delay also stays frame-driven (`jumpsAfterDelay` in `animationsManager.native.ts`, `UnsupportedTrackForm` from `nativeLayoutSummaryRefusal`). An immediate zero-duration animation can still play natively.

## 5. Dispatch and platform UI context rules

| Code fact | Source, relative to `Common/cpp/reanimated/NativeAnimations` |
| --- | --- |
| `start`, `cancel`, and `closeSurface` enqueue work. Any thread can call them. | `NativeAnimationHost.h:42`; `NativeAnimationHost.cpp:56`, `:108`, `:116` |
| `post` pushes under `queueMutex_` and releases it before `postToUIThread`. | `NativeAnimationHost.cpp:204` |
| `drain` selects `mountReports_` before `queue_`, removes one operation under `queueMutex_`, and releases it before the call. | `NativeAnimationHost.cpp:221` |
| Apple posts to the main dispatch queue. Android posts an asynchronous message to its main handler. | `apple/reanimated/apple/NativeAnimations/REANativeAnimationPlatform.mm:992`; `android/src/main/java/com/swmansion/reanimated/nativeAnimations/NativeAnimationExecutor.kt:204` (relative to the package) |

The real names in this table are the code symbols. `mountReports_` holds the client reports of mounted operations; `queue_` holds queued host operations. These facts describe the host queue mutex. They do not assert that another thread holds no other lock.

- `runAfterMount` runs in the platform report of a mount, inline. Its operations are `MountedStart`, `MountedStop`, and `MountedModel` (`NativeAnimationHost.h`). It runs each one before it returns, so the mounted state, each stop, and each new playback reach the screen in one platform transaction. Its client reports go to `mountReports_`.
- Layout collects the operations of a pull in `currentPull_` (`LayoutAnimationsProxy.h`, `PullRecord`) and gives them to the host in `surfaceDidMount`. A stop that the pull decides (a hand-over, a removal, a hide by a shared transition) is a `MountedStop` of that pull (`stopAfterMount`), so it reaches the screen with the mount.
- Apple: the pull, the mount, and the mount report are one call of the mounting manager (`CoreAnimationPlatform::mountReportOfPull`; report from `didMountComponentsWithRootTag` in `apple/reanimated/apple/REAMountObserver.mm`).
- Android: the mount report is the dispatch of mount items, from `willMountItems` to `didMountItems` (`android/src/main/java/com/swmansion/reanimated/NativeProxy.kt`, `AndroidNativeAnimationPlatform::willMountItems`, `didMountItems`). A pull outside a dispatch admits no native start. `MountedModel` changes the model of a live Android track (`modelDidChange`); Apple keeps the model in the layer and does nothing.
- Not tested: a mount report inside a client delivery of a drain operation.

## 6. Cancel, continuity transfer, physical events, and surface closure

- Stop modes (`TrackStopMode`): `SettleToModel` shows the model again (layout, surface closure, mounted stops); `KeepVisibleValue` writes the value on screen to the model first (CSS stops).
- Continuity: a layout start on a view with live native tracks captures the value of each live leaf from the build graph at the start time of the batch (`buildLayoutAnimation`, trace `LayoutLeafCaptured`), not from the presentation layer. A leaf that continues a live leaf has no new track. A continuation that only the frame driver can repeat (for example a delayed leaf on a live key) is `UnsupportedContinuation` (`relateToLiveLeaf` in `nativeLeaves.ts`, `needsFrameDriver`), and the frame driver continues on the timeline of the build.
- Write control: there is none. A write by another writer (a React commit, an animated style, CSS, a synchronous prop) changes the model; the native track keeps the screen until it ends, then the model shows. The trace has no write-policy event, because no policy exists.
- Physical events: the platform reports each end through the track end listener (`NativeAnimationHost::onPlatformTrackEnded`). `finished == false` is a removal that the host did not ask for (`TrackEnd::PlatformRemoved`). The layout client then gives the group to the frame driver (`NativeLayoutGroups::onTrackEnded`, `removeForFrameDriver`), and the callback gets `true` at the natural end.
- Surface closure: `ReanimatedMountHook::shadowTreeDidUnmount` calls `closeSurface`. `runCloseSurface` records `SurfaceClosed` and stops each command of the surface with `SettleToModel`; a command with no result ends `SurfaceDestroyed`. A queued `start` (the CSS form) for a surface that does not run ends `SurfaceDestroyed` with no admission (`runStart`).
- Development trace (`NativeAnimationTrace.h`): compiled only without `NDEBUG` or with `REANIMATED_RUNTIME_TEST_HOOKS`; UI thread only; the recorder keeps the newest 1024 events (`TraceRecorder::Capacity`). The transfer to the frame driver shows as `LayoutLeafCaptured`, `LayoutBuildFailed` with `UnsupportedContinuation`, `TrackEnded` with `finished` false, and `FrameUpdateMounted`. `LayoutMountReported` is the last event of a mount report that ran a host operation; it does not prove pixels.

`TrackEndIgnored` marks a platform end that reached the host after a stop or a replacement removed the track; no client gets a report. The test helper `takeTrace` (`apps/common-app/runtime-tests/reanimated/tests/nativeAnimationObservation.ts`) drops it unless a test asks for it, because it marks a race. `conflictHandle` names the other command of a conflict: the replacement on the ends of a replaced command, and the active command on an `OwnershipDenied` rejection. A replaced track that has reported its end, of a command that has its result, gives no event.

- Known limits: on Android, during a native opacity track, `view.alpha` holds a React write from the mount to the next pre-draw repair (`PreDrawReconciler.kt`). After the frame driver takes an Android transform track, the view keeps the end rotation of the track until the next commit; cause not tested.

## 7. Partial replacement and exactly-once results

- One logical group for each view (`NativeLayoutGroups`): the physical tracks of the current layout animation and the build whose callback they complete. A new request becomes the group. The tracks of the old group that the request does not replace join it with their keys; the old group ends with `false` (`NativeLayoutGroups::start`).
- The host replaces only the overlapping tracks (`conflictingTracks`, `releaseReplacedTracks`). A command keeps its records until each of its tracks ended.
- Owner priority (`hasPriorityOver`): layout wins over CSS; CSS wins over CSS; CSS never replaces layout. A request that loses ends `Rejected` with `OwnershipDenied`.
- Each command has one terminal result (`onAnimationEnded`; `Command::hasResult` in `NativeAnimationHost.h`). A later event of that command gives no second result. `endTrack` gives the result when the last track ends: `Finished`, or `Interrupted` with `PlatformRemoved`.
- Layout gives one callback for each build (`NativeLayoutBuildEnd::callbackResult`); the trace event `ClientEnded` marks the result that the host gives the layout client. A build stays on the UI runtime until the host has no track of it and its callback has its result.

## 8. Retained-exit admission and layout cleanup

- A native exit uses `HoldWithoutCommit` (`startNativePlayback`). An exit track with no duration is refused (`UnsupportedTrackForm`, `makeTrack`), because the host has no playback of its own for it.
- The group gives its callback `true` when each track reached its end, and keeps the held tracks (`Member::isHeld`, `finishIfPlayed`). The removal mount cancels the group; that cancel gives no second result. `completeNativeExits` lets the view leave.
- An Entering or Layout start on an exiting view starts nothing native (`ExitStateMismatch` in `nativeStartRefusal`). A platform removal of an exit gives the exit to the frame driver. A mounted rejection of an exit gives `false` one time and the view leaves.
- `clearSurfaceState` (`LayoutAnimationsProxy.cpp`) clears the layout configuration of each mapped light node with `clearLayoutAnimationConfig`, then clears the surface records, request rates, and native groups. Each group callback with no result gets `false`. This prevents configuration growth when Android stops a surface without a teardown pull.
- On iOS, retained exit views directly under a stopped surface root can stay in the component view registry. The lifecycle tests record this base behavior with `KEEPS_ROOT_EXIT_VIEWS_AT_SURFACE_STOP` (`nativeLayoutTestKit.tsx`). They do not prove that every retained view leaves the registry at surface stop.
- No guard object holds a retained exit, so the trace has no event for a hold, its refusal, or its release.

## 9. How to add a target or a platform form

1. Common: add the target to `AnimationTarget` and set its overlap in `targetsOverlap` (`NativeAnimationIdentity.cpp`). Add a value type to `AnimationValue` only if no existing one fits, and its rule in `valueMatchesTarget` (`NativeAnimationValue.h`).
1. Domain build: for layout, the JS leaf form (`summarizeNativeLeaf`) with its Jest tests (`__tests__/`), the key in `leafTarget` and its conversion in `makeTrack` (`NativeLayoutTracks.cpp`), and the limit in `NativeLayoutLimits` if the form adds segments. For CSS, the route table of each platform.
1. Apple: the clause in `CoreAnimationPlatform::unsupportedTargetCause`, the key path and the member of the play path in `REANativeAnimationPlatform.mm`, the endpoint check (`modelMatchesEndpoint`), and the sample.
1. Android: the clause in `AndroidNativeAnimationPlatform::targetCause` (state the API level), the track encoding (`encodeTracks`; Kotlin `TrackEncoding.kt`, `TrackBufferParser.kt`), the writer and the binding (`TrackWriter.kt`, `TrackBinding.kt`), the endpoint check (`modelEndsAt`), and the sample.
1. A new refusal clause: a value in `UnsupportedTargetCause` and its name in `toString` (`NativeAnimationTrace.cpp`).
1. Tests: a native case and a negative route case next to it in the runtime tests (`apps/common-app/runtime-tests/reanimated/tests/layoutAnimations/`), with the platform difference as a constant of `nativeLayoutTestKit.tsx` (for example `PLAYS_SIZE_CHANGE`, `PLAYS_3D_OPERATIONS`, `PLAYS_MOVING_GEOMETRY`). If the route of a preset changes, update `__tests__/nativeLayoutRoutePins.test.ts`.
1. Docs: the flag sections of `docs/docs-reanimated/docs/guides/feature-flags.md` if users can see the change, and a changelog fragment (`changelog/<slug>.<type>.md`).

A new timing kind on one platform follows steps 3 to 7: the timing check of that platform (`timingsCause` on Apple, `kAnimatorTimingKinds` and `playbackCause` on Android).

## 10. How to reproduce route, correctness, and performance tests

Builds:

- The runtime tests need the test hooks: `REANIMATED_RUNTIME_TEST_HOOKS` (iOS `DebugRuntimeTests` and `ReleaseRuntimeTests` configurations, `apps/fabric-example/ios/Podfile`; Android Gradle property `reanimatedRuntimeTestHooks`, `android/build.gradle.kts`). A production build has no trace, no sample, and no hook.
- The example app turns on the four static flags (`apps/fabric-example/package.json`). Change a static flag, then run `pod install` and build again (iOS). To test the frame-driven route, build with the layout flag off.
- Android: the native layout route needs the pull model of React Native. The runtime-tests driver builds with `--mount-thread-pull`, by default the value of `ANDROID_NATIVE_LAYOUT_ANIMATIONS` of the example app (Gradle property `fabricExampleMountThreadPull`, read in `apps/fabric-example/android/app/build.gradle`). It has no effect with `--skip-build`.

Runs (`AGENTS.md`, "Tests"):

```sh
yarn workspace fabric-example runtime-tests --library reanimated --platform ios --udid <udid> --only 'native layout route,native layout starts'
yarn workspace fabric-example runtime-tests --library reanimated --platform android --serial <serial> --only 'native layout presets'
```

- The suites of the native route are the `native layout ...` rows of `apps/common-app/runtime-tests/reanimated/suites.ts` and `css native transitions`. The route of each case comes from the trace (`routeOf` in `nativeAnimationObservation.ts`); `nativeAnimationRoutes` gives the route of the build (`off`, `configured`, `admitted`).
- The verdict is the line `[runtime-tests] passed: N, failed: M, skipped: K`, not the exit code. A run with no such line has no result.
- A Release run (`--configuration ReleaseRuntimeTests`) runs no Metro and reports to port 8082 (`apps/common-app/runtime-tests/ReJest/utils/serverUrl.ts`). Name the suites with `--only`: the suite `native layout fatal mount item` ends the app.
- A write to a JS file that Metro serves reloads a running Debug app, and the run ends with "device disconnected". Do not edit test files during a run. Turn Fast Refresh off in the app before a long run.
- Keep the trace under 1024 events between two takes (`TraceRecorder::Capacity`): a scene with more events loses the oldest.
- A run whose device log has "Unable to find module for" at the app start is not valid (a stale module provider file broke `Modal` cases once). Run `pod install` again.
- Record the display rate of an Android device with the run (`adb -s <serial> shell settings get system peak_refresh_rate`): frame-time checks and spring leads differ between 60 Hz and 120 Hz.

Correctness:

- Each native case has a frame-driven twin (`frameDrivenOf`, `play` in `nativeLayoutReferencePlay.tsx`). Apple asserts the twin timeline at common times; Android prints the rows and does not assert the one-frame bound.
- A paired read is valid only at instants where the twin had a frame in the last display frame. The retake helper `takeAtFrameDriverFrame` (`nativeLayoutTestKit.tsx`) drops stalled instants, so a pair proves nothing about them.

Performance:

- The repository has no automated budget check. Build with profiling markers (iOS: `IS_REANIMATED_PROFILING` in `RNReanimated.podspec`; Android: the app `ext` property `enableReanimatedProfiling`, read by `safeAppExtGet` in `android/build.gradle.kts`) and record a platform trace. The markers of the native route are `ReanimatedSystraceSection` names, for example `LayoutAnimationsManager::buildLayoutAnimation`, `makeNativeLayoutTracks`, `LayoutAnimationsProxy::startNativePlayback`, `NativeAnimationHost::admit`, `NativeAnimationHost::runAfterMount`, and the `resolve` and `start` sections of each platform.
- Measure Release builds. Debug costs of the easing fit and the spring summary are not budgets.

## 11. Measured costs and open checks

The latest Pixel 9a Release set at 60 Hz compares the native-layout flag on and off, with twelve counted windows per scene and product. It has no performance PASS: energy increases in the rapid-layout scene with twenty views (+0.215 J, 95% interval +0.045 to +0.380 J) and the hundred-view restart scene (+0.327 J, interval +0.068 to +0.450 J). The hundred-view moving X/Y transform refusal has a first-write shift of +3.918 ms (interval +1.783 to +6.401 ms); the budget upper bound is 6.1 ms.

The rapid-layout scene passes the per-view request check: each view starts nineteen native layouts, then the twentieth request uses the frame driver. No host admission follows the last refusal. Tail UI-runtime pull counts differ from the flag-off median by at most one. These counts do not establish the cause of the energy cost. Each refused size scene has zero builds and conversions. The moving X/Y transform scene has one build per view and zero conversions, but still exceeds its time budget.

The public flag page states the earlier 120 Hz costs separately. The new 120 Hz set still needs the device owner to change the display setting. The physical-iPhone, sanitizer and final runtime checks are incomplete at this documents revision. Do not use this document as a rollout approval. Keep failures and their bounds until the owner resolves them; the live-clock test contract also remains open.
