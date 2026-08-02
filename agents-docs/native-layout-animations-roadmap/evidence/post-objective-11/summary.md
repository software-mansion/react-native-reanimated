# Post-Objective-11 Evidence

## Result

Objective 11 completes the public entering, layout, and exiting lifecycle for
the iOS native path. Lifecycle compiler tests, the full repository checks, and
the FabricExample iOS Simulator build pass.

Simulator playback is intentionally not claimed. A fresh build installed and
launched, but the bounded Argent execution window expired before it reached the
bench. The roadmap permits skipping a bounded validation wall instead of
stalling implementation.

## Lifecycle contract

- Pending callbacks use surface, tag, and generation identity and execute on
  the UI runtime.
- Generations remain monotonic for the lifetime of a surface, preventing tag
  reuse from reattaching stale completion.
- Reduced-motion and zero-duration graphs mount their final state, complete
  successfully, and perform retained-exit cleanup without scheduling Core
  Animation.
- Native parse or capability rejection discards the pending native callback
  before the whole graph starts on the legacy path.
- Surface teardown cancels active native callbacks with `finished=false`,
  suppresses cleanup mounts, and releases surface-local generation state.
- A top-level negative delay advances each track's initial timeline offset.
  Unsupported nested negative-delay composition routes the complete graph to
  legacy.

## Public-semantics bench coverage

The test bench adds entering followed by layout, entering removed before
platform start, layout interrupted by exit, forced exit cleanup, nested exit,
reparenting, Modal surface removal, resolved random delay, and negative delay.
These scenarios are available for a later visual validation run; this evidence
does not claim their playback result.

## Repository checks

- Full package tests: 95 suites and 1,449 tests passed.
- Layout-reanimation tests: 4 suites and 44 tests passed.
- Native package and common-app typechecks: pass.
- `common-app lint`: zero errors; 208 pre-existing warnings.
- JavaScript, Apple, and Android lint: pass.
- Debug FabricExample iOS Simulator build: pass.

## Validation limits

- The fresh app installed and launched, but no bench scenario was reached
  before the bounded Argent window ended.
- No playback, callback, visual-parity, ASan, frame-accurate video, physical
  device, or system reduced-motion-toggle result is claimed.
