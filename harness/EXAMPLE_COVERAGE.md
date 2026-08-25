# Manual example coverage

The host suite translates manual examples into their native mutation and animation-orchestration behavior. Examples that differ only in JavaScript interpolation share one native scenario; the harness deliberately does not re-test worklet math.

## Layout animations

| Manual examples | Native behavior exercised | Harness tests |
| --- | --- | --- |
| BasicLayoutAnimation, CustomLayout, LayoutTransitionExample, SpringLayoutAnimation, ChangeTheme | layout start, progress, replacement from the mounted frame, exact final geometry | `LayoutProgressAndRetargetUseTheCurrentMountedFrame`, `RapidReordersRetargetEveryMountedItem` |
| DefaultAnimations, DefaultAnimationsOverrides, KeyframeAnimation, ReducedMotionLayoutExample | entering/exiting/layout config delivery, replacement, and removal; preset/keyframe/reduced-motion math remains in JavaScript tests | `ExitingViewStaysMountedUntilItsAnimationEnds`, `RemovingAnExitConfigUnmountsWithoutStartingIt`, `EnteringLayoutAndExitingShareOneCommit` |
| BasicNestedAnimation, BasicNestedLayoutAnimation, Nested, DeleteAncestorOfExiting | retained ancestors, nested removals, and independently completing descendants | `ExitingDescendantKeepsDeletedAncestorsAlive`, `TwoExitingSiblingsCanFinishOutOfOrder` |
| Combined, MountingUnmounting, StrictModeComparisonExample | replacement between entering/layout/exiting and recreate-before-cleanup | `EnteringLayoutAndExitingShareOneCommit`, `RecreatingAnExitingTagCancelsTheStaleRemoval` |
| NestedLayoutAnimationConfig, FlatListSkipEnteringExiting | inherited and overridden exit suppression | `SkipExitingOnAnAncestorRemovesItsAnimatedSubtreeImmediately`, `NestedSkipExitingCanBeOverriddenForAChild` |
| ReparentingExample, MoveWithExiting, ViewFlattening | real differentiator flatten/unflatten moves while children update or disappear | `ReparentingStartsLayoutAnimationAndMovesTheView`, `FlatteningAParentWhileRemovingAChildKeepsHostOrderConsistent`, `NestedChurnChangesFlatteningWhileChildrenEnterAndExit` |
| DurationZero | first-frame progress and completion | `ZeroDurationEnteringCanSettleOnItsFirstFrame` |
| ExitingTagReuseStressExample, ViewRecyclingExample | new `ShadowNodeFamily` with a recycled native tag, interrupted entering, and stale exiting cleanup | `RecycledTagsReplaceStillExitingInstances`, `SixtyViewBurstsInterruptEnteringWithExiting` |
| InterruptedExitingExample | blocked UI lane, queued Android start, later skip-exiting cleanup, and stale-start cancellation | `InterruptedExitsAreCancelledBeforeBlockedUIWorkRuns` |
| AnimatedList, ListItemLayoutAnimation, SwipeableList, HabitsExample, ReactionsCounterExample, BBExample, Carousel, FlatListWithLayoutAnimationsExample | repeated insertion, deletion, reorder, geometry changes, and retargeting | `MixedListChurnOverlapsEnteringLayoutAndExiting`, `RapidReordersRetargetEveryMountedItem`, `BusyMainLaneCoalescesRapidLayoutCommits` |
| AnimatedTouchables, BottomTabs, OlympicAnimation | rapid mount/layout changes; gesture and visual interpolation stay outside the native harness | `MixedListChurnOverlapsEnteringLayoutAndExiting`, `NestedChurnChangesFlatteningWhileChildrenEnterAndExit` |
| Modal, ModalNewAPI, NativeModals, NestedNativeStacksWithLayout, ModalExitingExample, SuspenseLayoutAnimationCrashExample | reentrant mounting and retained/remounted subtrees are covered; UIKit, Android view-manager, Suspense, and react-native-screens integration are not instantiated | `AnimatedMountSideEffectCommitsAFollowUpTree`, platform reentrancy tests, nested and interrupted-exit stress tests |

`DisplayNoneCanToggleRepeatedlyAroundLayoutAnimations` separately runs React Native's real platform differ through 40 `display: none` transitions.

## Shared transitions

| Manual examples | Native behavior exercised | Harness tests |
| --- | --- | --- |
| ScreenlessBasic, Gallery, Card, ImageStack, Profiles, LayoutAnimation, ChangeTheme, CustomTransition, BorderRadii | active-boundary selection, matching shared tags, synthetic container insertion, animation, cleanup, and target restoration | `SharedTagMovesBetweenActiveBoundaries` |
| ProgressTransition | transition start, progress updates, completion or cancellation, and container cleanup | `InteractiveSharedTransitionProgressesAndFinishes`, `CancellingInteractiveSharedTransitionRestoresBothSides` |
| ManyTags, FlatList, ManyScreens | many simultaneous shared-tag matches and container lifecycles | `ManySharedTagsToggleBetweenBoundaries` |
| TransitionRestart, RestoreState, TabNavigatorExample | a live shared transition repeatedly retargeted before completion | `SharedTransitionRetargetsBeforeItSettles` |
| DuplicateTags | repeated shared names, replacement, and cleanup without orphaned synthetic containers | `DuplicateSharedNamesDoNotLeaveSyntheticContainers` |
| Modals, NestedRotation, NestedStacks, ReducedMotionSharedExample | core shared-container behavior is covered; native navigation snapshots, rotation, and reduced-motion worklet behavior remain integration scope | shared-boundary scenario and stress tests |

## Stress volume

A full run includes, per platform mode:

- 100 rounds across 24 continuously retargeted layout views;
- 80 mixed list rounds with overlapping entering, layout, and exiting;
- 150 recycled-tag replacements before stale exits finish;
- 60 blocked-UI interrupted-exit cycles;
- 160 commits accumulated behind one busy UI interval;
- 20 bursts of 60 views whose entering animations are immediately replaced by exits;
- 40 boundary switches with 24 simultaneous shared transitions;
- 80 retargets of one still-running shared transition;
- 120 nested rounds combining flattening changes with child entering, exiting, and layout.
