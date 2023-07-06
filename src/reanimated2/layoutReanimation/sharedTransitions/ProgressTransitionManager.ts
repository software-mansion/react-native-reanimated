import { runOnUIImmediately } from '../../threads';
import type { ProgressAnimation } from '../animationBuilder/commonTypes';

function createProgressTransitionManager() {
  'worklet';
  const progressAnimations = new Map<number, ProgressAnimation>();
  const snapshots = new Map<number, any>();
  const currentTransition = new Set<number>();
  const toRemove = new Set<number>();

  const progressTransitionManager = {
    addProgressAnimation: (
      viewTag: number,
      progressAnimation: ProgressAnimation
    ) => {
      progressAnimations.set(viewTag, progressAnimation);
    },
    removeProgressAnimation: (viewTag: number) => {
      if (progressAnimations.size > 1) {
        // Remove the animation config after the transition is finished
        toRemove.add(viewTag);
      } else {
        progressAnimations.delete(viewTag);
      }
    },
    onTransitionStart: (viewTag: number, snapshot: any) => {
      snapshots.set(viewTag, snapshot);
      currentTransition.add(viewTag);
      // set initial style for re-parented components
      progressTransitionManager.frame(0);
    },
    frame: (progress: number) => {
      for (const viewTag of currentTransition) {
        const progressAnimation = progressAnimations.get(viewTag);
        const snapshot = snapshots.get(viewTag);
        progressAnimation!(viewTag, snapshot, progress);
      }
    },
    onTransitionEnd: (removeViews = false) => {
      for (const viewTag of currentTransition) {
        _notifyAboutEnd(viewTag, false, removeViews);
      }
      currentTransition.clear();
      snapshots.clear();
      if (toRemove.size > 0) {
        for (const viewTag of toRemove) {
          progressAnimations.delete(viewTag);
        }
        toRemove.clear();
      }
    },
  };
  return progressTransitionManager;
}

runOnUIImmediately(() => {
  'worklet';
  global.ProgressTransitionManager = createProgressTransitionManager();
})();

export type ProgressTransitionManager = ReturnType<
  typeof createProgressTransitionManager
>;
