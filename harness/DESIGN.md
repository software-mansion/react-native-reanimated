# Layout animation test harness

## Goal

The harness tests Reanimated layout-animation orchestration against React Native's real shadow-tree differ without creating a React host. The same tests must run on main and on layout-animation pull requests so regressions are visible as changes in observable behavior.

Tests declare realistic input events on virtual JS and UI lanes. They do not call `pullTransaction` or inspect proxy state. Platform drivers own pull, accumulation, mount, and reentrancy behavior.

## Test model

A test can submit these events:

- render a shadow-tree snapshot on the JS lane;
- advance virtual time or mark a lane busy;
- run an Android frame;
- commit a synchronous state update from a mount side effect;
- configure, progress, replace, or end an animation;
- toggle shared-transition boundaries and drive interactive transition progress.

Each snapshot has an implicit root and declarative view nodes. A per-surface registry preserves `ShadowNodeFamily` identity for every tag across snapshots. Node frames become `position: absolute` Yoga inputs relative to their declared parent, so `ShadowTree::commit` can run its normal layout phase while tests keep exact geometry.

A node can declare `onMount`, `onUpdate`, or `onRemove`. The driver runs the callback immediately after applying the matching host mutation. Side effects may make a synchronous commit, which exercises platform reentrancy through the ordinary delegate path.

## Runtime pieces

`Choreographer` runs all tasks on one physical thread. It tracks virtual time, lane availability, and the currently executing lane. A stable sequence number orders events with the same due time. This gives deterministic interleavings without weakening the production lock boundaries.

`TreeBuilder` creates real `RootShadowNode`, `ViewShadowNode`, shared-transition boundary, and `RNSScreen` revisions. Shared-transition fixtures place active boundaries under screen families so the proxy traverses the same component-name ancestry it expects in an app. `ShadowTree` owns the real `MountingCoordinator`, differentiator, and introspection `StubViewTree`.

`PlatformDriver` implements `ShadowTreeDelegate` and applies returned transactions to a second `StubViewTree`, which represents the host hierarchy.

`AnimationHarness` owns a bare Hermes runtime, the real `LayoutAnimationsManager`, and the real experimental proxy. It adapts at compile time to both the pre-registry single proxy and the newer per-surface proxy registry without changing test stimuli. Its tiny host-function repository records starts and stops. When a pre-registry proxy start replaces an animation already running for the same tag, it sends the same synchronous native end notification as the production JavaScript manager. Progress flushes on a frame before completion.

The newer Worklets scheduler normally caches UI-thread identity in thread-local storage. Because the harness runs virtual JS and UI lanes on one physical thread, its bridge asks the choreographer for the current lane on every query. This preserves the production decision boundary without introducing real-thread nondeterminism.

The driver modes are:

| Mode | Pull | Mount |
| --- | --- | --- |
| Android push | synchronously when a commit finishes; merge by surface | UI frame or synchronous UI commit |
| Android pull | on the UI lane when rendering | same Android mount-item queue |
| iOS | on the main/UI lane | immediately, with a follow-up pull after reentrant commits |

The Android mount-item queue snapshots its current items and rejects nested dispatch. Items created by a mount side effect therefore wait for the next frame. The iOS driver records a follow-up request and pulls it on the same stack after the current mount.

The Android push driver can pause one asynchronous mount at the boundary after C++ swaps its pending transaction but before Java receives the mount item. UI work may run during that interruption; resuming the paused JS stack still precedes callbacks already queued to the JS lane. This narrow test control reproduces the historical cleanup inversion without exposing a raw pull operation.

## Observable assertions

Tests assert host-tree tags, hierarchy, mounting logs, animation-driver calls, and mounted transaction count or order. They do not assert private Reanimated containers or pending maps. `RN_SHADOW_TREE_INTROSPECTION` remains enabled so React Native also verifies every pulled transaction against its own `StubViewTree`.

Every native test declares a description beside its body. The description explains the protected invariant and the failure it prevents in two or more short sentences; it does not restate the timeline. Tests for a known Reanimated GitHub report also declare its number.

Shared-transition tests use Reanimated's real `REASharedTransitionBoundaryShadowNode`. Synthetic containers are observed only through their host-tree lifecycle and recorded animation calls.

## Running

From the repository root:

```sh
cmake -S harness -B build/layout-animation-harness -G Ninja
cmake --build build/layout-animation-harness --parallel
ctest --test-dir build/layout-animation-harness --output-on-failure
```

`REACT_COMMON_DIR`, `REANIMATED_DIR`, `WORKLETS_DIR`, and `HERMES_ROOT` are cache variables for testing another React Native or Reanimated checkout. The two binaries compile the proxy separately with and without `ANDROID`; the Android binary runs every scenario in both push and pull modes.

See [EXAMPLE_COVERAGE.md](EXAMPLE_COVERAGE.md) for the manual-example mapping.

Run [MUTATION_TESTING.md](MUTATION_TESTING.md) to verify that the behavioral tests fail when selected native invariants or the two historical PR fixes are deliberately reversed.

For local inspection, run `node harness/dashboard/server.mjs --build build/layout-animation-harness` and open `http://127.0.0.1:4173`. The dashboard runs individual native tests and replays the mounted host hierarchy after every transaction, including layout metrics, opacity, z-index, and mutation lists. Trace output is enabled only for dashboard-launched processes.

## Current coverage

- entering, exiting, layout, replacement, progress, and completion;
- nested exits, ancestor retention, skip-exiting overrides, flattening, `display: none`, recycled families, and duration zero;
- Android queue accumulation, iOS coalescing, blocked UI work, mount-order inversion, and synchronous reentrant commits;
- shared-boundary switches, interactive progress, many-tag transitions, and repeated live retargeting;
- deterministic list, tag-reuse, burst, nested-tree, and coalescing stress loops.

The Android and non-Android proxy variants are separate targets because `ANDROID` changes Reanimated and React Native ABI at compile time. The Android React Native units use Android props and serializable state; the non-Android target uses the host/iOS shape.

## Boundaries

The harness covers shadow-tree commits, mutation generation, proxy orchestration, accumulation, and host mutation ordering. It does not cover JNI mutation serialization, Objective-C mounting instructions, native view implementations, or JavaScript interpolation math.
