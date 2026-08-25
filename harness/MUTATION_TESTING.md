# Mutation testing

The mutation runner copies the configured Reanimated `Common` sources into a temporary directory. It changes one production invariant at a time, rebuilds the affected harness binary, and requires the named behavioral test to fail. A build failure does not count as a killed mutation.

Run it against an already configured harness build:

```sh
node harness/mutations/run.mjs --build build/layout-animation-harness
```

The initial matrix targets the highest-risk native orchestration paths:

| Mutation | Expected detector |
| --- | --- |
| ignore cancellation of an Android animation start queued before removal | `InterruptedExitsAreCancelledBeforeBlockedUIWorkRuns` |
| omit cleanup when React recreates a tag whose old family is still exiting | `RecreatingAnExitingTagCancelsTheStaleRemoval` |
| retarget from the React frame instead of the currently mounted animation frame | `LayoutProgressAndRetargetUseTheCurrentMountedFrame` |
| discard the completion count when replacing an active layout animation | `LayoutProgressAndRetargetUseTheCurrentMountedFrame` |
| omit completed shared-container cleanup | `SharedTagMovesBetweenActiveBoundaries` |
| discard animated props from a progress update while retaining its frame | `ProgressAppliesAnimatedStyleProps` |

This matrix demonstrates sensitivity to these faults. It does not prove that the suite detects every possible implementation error.

All six mutations were killed against `main` on 26 August 2026.
