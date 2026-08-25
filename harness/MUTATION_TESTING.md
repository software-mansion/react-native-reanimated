# Mutation testing

The mutation runner copies the configured Reanimated `Common` sources into a temporary directory. It changes one production invariant at a time, rebuilds the affected harness binary, and requires the named behavioral test to fail. A build failure does not count as a killed mutation.

Run it against an already configured harness build:

```sh
node harness/mutations/run.mjs --build build/layout-animation-harness
```

The runner detects the proxy generation from the configured `REANIMATED_DIR` and selects the matching matrix.

The pre-registry experimental-proxy matrix targets the highest-risk native orchestration paths:

| Mutation | Expected detector |
| --- | --- |
| ignore cancellation of an Android animation start queued before removal | `InterruptedExitsAreCancelledBeforeBlockedUIWorkRuns` |
| omit cleanup when React recreates a tag whose old family is still exiting | `RecreatingAnExitingTagCancelsTheStaleRemoval` |
| retarget from the React frame instead of the currently mounted animation frame | `LayoutProgressAndRetargetUseTheCurrentMountedFrame` |
| discard the completion count when replacing an active layout animation | `LayoutProgressAndRetargetUseTheCurrentMountedFrame` |
| omit completed shared-container cleanup | `SharedTagMovesBetweenActiveBoundaries` |
| keep a shared view's parent-relative position instead of converting it to root coordinates | `InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress` |
| ignore interactive shared-transition progress after creating its container | `InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress` |
| discard animated props from a progress update while retaining its frame | `ProgressAppliesAnimatedStyleProps` |
| start a synchronously completing exit before registering its light node, reversing the fix for #9646 | `ImmediateExitCompletionCanReenterTheStartCallback` |
| stop treating `RNSModalScreen` removal as a screen pop, reversing the fix for #7667 | `RemovingAModalScreenSkipsDescendantExitAnimations` |
| omit bookkeeping for a WAITING subview whose tag React recreates, reversing one #10073 case | `RecreatingAWaitingSubviewFlushesItsWithheldRemoval` |
| ignore a settled DEAD exit whose tag React recreates before cleanup, reversing the other #10073 case | `RecreatingASettledExitBeforeCleanupReplacesTheDeadNode` |

This matrix demonstrates sensitivity to these faults. It does not prove that the suite detects every possible implementation error.

The proxy-registry matrix reverses the two historical fixes that motivated the cross-branch harness plus four shared orchestration invariants:

| Reversed fix | Expected detector |
| --- | --- |
| let a UI-thread cleanup pull emit structural mutations before a paused JS→Java mount call resumes (PR 10372) | `UICleanupCannotOvertakeAPausedJSMountSchedule` |
| stop retargeting with the layout config captured by the active animation after React removes that config (PR 10373) | `ConfigRemovalRetargetsWithTheCapturedLayoutConfig` |
| keep a shared view's parent-relative position instead of converting it to root coordinates | `InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress` |
| ignore interactive shared-transition progress after creating its container | `InteractiveSharedTransitionUsesAbsoluteGeometryAtEveryProgress` |
| stop treating `RNSModalScreen` removal as a screen pop | `RemovingAModalScreenSkipsDescendantExitAnimations` |
| omit bookkeeping for a WAITING subview whose tag React recreates | `RecreatingAWaitingSubviewFlushesItsWithheldRemoval` |

The 10372 detector pauses at the unguarded boundary between swapping the C++ pending transaction and calling Java's mount scheduler. UI work may run there, but the paused JS stack resumes before the queued JS cleanup task. This reproduces the real mount-order inversion without exposing `pullTransaction` to tests.

Results on 26 August 2026:

- pre-registry experimental proxy on `main`: 12/12 killed;
- proxy-registry stack through PR 10373: 6/6 killed;
- unmodified `main`: 42/42 iOS and 39/39 Android tests passed;
- unmodified proxy-registry stack: 43/43 iOS and 41/41 Android tests passed.
