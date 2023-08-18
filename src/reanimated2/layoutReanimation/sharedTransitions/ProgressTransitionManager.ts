import { runOnUIImmediately } from '../../threads';
import type { ProgressAnimation } from '../animationBuilder/commonTypes';
import { registerEventHandler, unregisterEventHandler } from '../../core';
import { Platform } from 'react-native';

type TransitionProgressEvent = {
  closing: number;
  goingForward: number;
  eventName: string;
  progress: number;
  target: number;
};

export class ProgressTransitionManager {
  private _sharedElementCount = 0;
  private _eventHandler = {
    isRegistered: false,
    onTransitionProgress: -1,
    onAppear: -1,
    onDisappear: -1,
    onSwipeDismiss: -1,
  };

  public addProgressAnimation(
    viewTag: number,
    progressAnimation: ProgressAnimation
  ) {
    runOnUIImmediately(() => {
      'worklet';
      global.ProgressTransitionRegister.addProgressAnimation(
        viewTag,
        progressAnimation
      );
    })();
    this.registerEventHandlers();
  }

  public removeProgressAnimation(viewTag: number) {
    this.unregisterEventHandlers();
    runOnUIImmediately(() => {
      'worklet';
      global.ProgressTransitionRegister.removeProgressAnimation(viewTag);
    })();
  }

  private registerEventHandlers() {
    this._sharedElementCount++;
    const eventHandler = this._eventHandler;
    if (!eventHandler.isRegistered) {
      eventHandler.isRegistered = true;
      const eventPrefix = Platform.OS === 'android' ? 'on' : 'top';
      let lastProgressValue = -1;
      eventHandler.onTransitionProgress = registerEventHandler(
        (event: TransitionProgressEvent) => {
          'worklet';
          const progress = event.progress;
          if (progress === lastProgressValue) {
            // During screen transition, handler receives two events with the same progress
            // value for both screens, but for modals, there is only one event. To optimize
            // performance and avoid unnecessary worklet calls, let's skip the second event.
            return;
          }
          lastProgressValue = progress;
          global.ProgressTransitionRegister.frame(progress);
        },
        eventPrefix + 'TransitionProgress'
      );
      eventHandler.onAppear = registerEventHandler((e) => {
        'worklet';
        console.log('onAppear', e);
        global.ProgressTransitionRegister.onTransitionEnd(false);
      }, eventPrefix + 'Appear');

      if (Platform.OS === 'android') {
        // onFinishTransitioning event is available only on Android and
        // is used to handle closing modals
        eventHandler.onDisappear = registerEventHandler(() => {
          'worklet';
          global.ProgressTransitionRegister.onAndroidFinishTransitioning();
        }, 'onFinishTransitioning');
      } else if (Platform.OS === 'ios') {
        // topDisappear event is required to handle closing modals on iOS
        eventHandler.onDisappear = registerEventHandler((e) => {
          'worklet';
          console.log('onDisappear', e);
          global.ProgressTransitionRegister.onTransitionEnd(true);
        }, 'topDisappear');
        eventHandler.onSwipeDismiss = registerEventHandler(() => {
          'worklet';
          console.log('onSwipeDismiss');
          global.ProgressTransitionRegister.onTransitionEnd();
        }, 'topGestureCancel');
      }
    }
  }

  private unregisterEventHandlers(): void {
    this._sharedElementCount--;
    if (this._sharedElementCount === 0) {
      const eventHandler = this._eventHandler;
      eventHandler.isRegistered = false;
      if (eventHandler.onTransitionProgress !== -1) {
        unregisterEventHandler(eventHandler.onTransitionProgress);
        eventHandler.onTransitionProgress = -1;
      }
      if (eventHandler.onAppear !== -1) {
        unregisterEventHandler(eventHandler.onAppear);
        eventHandler.onAppear = -1;
      }
      if (eventHandler.onDisappear !== -1) {
        unregisterEventHandler(eventHandler.onDisappear);
        eventHandler.onDisappear = -1;
      }
      if (eventHandler.onSwipeDismiss !== -1) {
        unregisterEventHandler(eventHandler.onSwipeDismiss);
        eventHandler.onSwipeDismiss = -1;
      }
    }
  }
}

function createProgressTransitionRegister() {
  'worklet';
  const progressAnimations = new Map<number, ProgressAnimation>();
  const snapshots = new Map<number, any>();
  const currentTransitions = new Set<number>();
  const toRemove = new Set<number>();

  let ignoreCleaning = false;
  let restartTransition = false;
  let ignoreCleaning2 = false;

  const progressTransitionManager = {
    addProgressAnimation: (
      viewTag: number,
      progressAnimation: ProgressAnimation
    ) => {
      console.log('addProgressAnimation', viewTag);
      if (currentTransitions.size > 0) {
        restartTransition = true;
        ignoreCleaning2 = true;
      }
      progressAnimations.set(viewTag, progressAnimation);
    },
    removeProgressAnimation: (viewTag: number) => {
      console.log('removeProgressAnimation', viewTag);
      if (currentTransitions.size > 0) {
        restartTransition = true;
      }
      // Remove the animation config after the transition is finished
      toRemove.add(viewTag);
    },
    onTransitionStart: (viewTag: number, snapshot: any) => {
      console.log('onTransitionStart', viewTag);
      if (restartTransition) {
        ignoreCleaning = true;
      }
      snapshots.set(viewTag, snapshot);
      currentTransitions.add(viewTag);
      // set initial style for re-parented components
      progressTransitionManager.frame(0);
    },
    frame: (progress: number) => {
      for (const viewTag of currentTransitions) {
        const progressAnimation = progressAnimations.get(viewTag);
        if (!progressAnimation) {
          console.log(progressAnimations, viewTag);
          continue;
        }
        const snapshot = snapshots.get(viewTag);
        progressAnimation!(viewTag, snapshot, progress);
      }
    },
    onAndroidFinishTransitioning: () => {
      console.log('onAndroidFinishTransitioning');
      if (toRemove.size > 0) {
        // it should be ran only on modal closing
        progressTransitionManager.onTransitionEnd();
      }
    },
    onTransitionEnd: (removeViews = false) => {
      if (currentTransitions.size == 0) {
        toRemove.clear()
        return;
      }
      console.log('onTransitionEnd');
      if (ignoreCleaning2) {
        ignoreCleaning2 = false;
        console.log('---ignoreCleaning2');

        for (const viewTag of currentTransitions) {
          _notifyAboutEnd(viewTag, false);
        }
        return;
      }
      if (ignoreCleaning) {
        ignoreCleaning = false;
        restartTransition = false;
        console.log('---omitCleaning');
        return;
      }
      for (const viewTag of currentTransitions) {
        _notifyAboutEnd(viewTag, removeViews);
      }
      currentTransitions.clear();
      snapshots.clear();
      if (restartTransition) {
        console.log('---restartTransition');
        return;
      }
      if (toRemove.size > 0) {
        for (const viewTag of toRemove) {
          console.log('removeProgressAnimationDZIK', viewTag);
          progressAnimations.delete(viewTag);
          _notifyAboutEnd(viewTag, removeViews);
        }
        toRemove.clear();
      }
    },
  };
  return progressTransitionManager;
}

runOnUIImmediately(() => {
  'worklet';
  global.ProgressTransitionRegister = createProgressTransitionRegister();
})();

export type ProgressTransitionRegister = ReturnType<
  typeof createProgressTransitionRegister
>;
