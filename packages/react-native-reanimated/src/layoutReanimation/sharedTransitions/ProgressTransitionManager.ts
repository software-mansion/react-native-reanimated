'use strict';
import { Platform } from 'react-native';

import type {
  ProgressAnimation,
  SharedTransitionAnimationsValues,
} from '../../commonTypes';
import { registerEventHandler, unregisterEventHandler } from '../../core';
import { ReanimatedError } from '../../errors';
import { isJest, shouldBeUseWeb } from '../../PlatformChecker';
import { runOnUIImmediately } from '../../threads';

type TransitionProgressEvent = {
  closing: number;
  goingForward: number;
  eventName: string;
  progress: number;
  target: number;
};

const IS_ANDROID = Platform.OS === 'android';

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

  public removeProgressAnimation(viewTag: number, isUnmounting = true) {
    this.unregisterEventHandlers();
    runOnUIImmediately(() => {
      'worklet';
      global.ProgressTransitionRegister.removeProgressAnimation(
        viewTag,
        isUnmounting
      );
    })();
  }

  private registerEventHandlers() {
    this._sharedElementCount++;
    const eventHandler = this._eventHandler;
    if (!eventHandler.isRegistered) {
      eventHandler.isRegistered = true;
      const eventPrefix = IS_ANDROID ? 'on' : 'top';
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
      eventHandler.onAppear = registerEventHandler(() => {
        'worklet';
        global.ProgressTransitionRegister.onTransitionEnd();
      }, eventPrefix + 'Appear');

      if (IS_ANDROID) {
        // onFinishTransitioning event is available only on Android and
        // is used to handle closing modals
        eventHandler.onDisappear = registerEventHandler(() => {
          'worklet';
          global.ProgressTransitionRegister.onAndroidFinishTransitioning();
        }, 'onFinishTransitioning');
      } else if (Platform.OS === 'ios') {
        // topDisappear event is required to handle closing modals on iOS
        eventHandler.onDisappear = registerEventHandler(() => {
          'worklet';
          global.ProgressTransitionRegister.onTransitionEnd(true);
        }, 'topDisappear');
        eventHandler.onSwipeDismiss = registerEventHandler(() => {
          'worklet';
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
  const snapshots = new Map<
    number,
    Partial<SharedTransitionAnimationsValues>
  >();
  const currentTransitions = new Set<number>();
  const toRemove = new Set<number>();

  let skipCleaning = false;
  let isTransitionRestart = false;

  const progressTransitionManager = {
    addProgressAnimation: (
      viewTag: number,
      progressAnimation: ProgressAnimation
    ) => {
      if (currentTransitions.size > 0 && !progressAnimations.has(viewTag)) {
        // there is no need to prevent cleaning on android
        isTransitionRestart = !IS_ANDROID;
      }
      progressAnimations.set(viewTag, progressAnimation);
    },
    removeProgressAnimation: (viewTag: number, isUnmounting: boolean) => {
      if (currentTransitions.size > 0) {
        // there is no need to prevent cleaning on android
        isTransitionRestart = !IS_ANDROID;
      }
      if (isUnmounting) {
        // Remove the animation config after the transition is finished
        toRemove.add(viewTag);
      } else {
        // if the animation is removed, without ever being started, it can be removed immediately
        progressAnimations.delete(viewTag);
      }
    },
    onTransitionStart: (
      viewTag: number,
      snapshot: Partial<SharedTransitionAnimationsValues>
    ) => {
      skipCleaning = isTransitionRestart;
      snapshots.set(viewTag, snapshot);
      currentTransitions.add(viewTag);
      // set initial style for re-parented components
      progressTransitionManager.frame(0);
    },
    frame: (progress: number) => {
      for (const viewTag of currentTransitions) {
        const progressAnimation = progressAnimations.get(viewTag);
        if (!progressAnimation) {
          continue;
        }
        const snapshot = snapshots.get(
          viewTag
        )! as SharedTransitionAnimationsValues;
        progressAnimation(viewTag, snapshot, progress);
      }
    },
    onAndroidFinishTransitioning: () => {
      if (toRemove.size > 0) {
        // it should be ran only on modal closing
        progressTransitionManager.onTransitionEnd();
      }
    },
    onTransitionEnd: (removeViews = false) => {
      if (currentTransitions.size === 0) {
        toRemove.clear();
        return;
      }
      if (skipCleaning) {
        skipCleaning = false;
        isTransitionRestart = false;
        return;
      }
      for (const viewTag of currentTransitions) {
        global._notifyAboutEnd(viewTag, removeViews);
      }
      currentTransitions.clear();
      if (isTransitionRestart) {
        // on transition restart, progressAnimations should be saved
        // because they potentially can be used in the next transition
        return;
      }
      snapshots.clear();
      if (toRemove.size > 0) {
        for (const viewTag of toRemove) {
          progressAnimations.delete(viewTag);
          global._notifyAboutEnd(viewTag, removeViews);
        }
        toRemove.clear();
      }
    },
  };
  return progressTransitionManager;
}

if (shouldBeUseWeb()) {
  const maybeThrowError = () => {
    // Jest attempts to access a property of this object to check if it is a Jest mock
    // so we can't throw an error in the getter.
    if (!isJest()) {
      throw new ReanimatedError(
        '`ProgressTransitionRegister` is not available on non-native platform.'
      );
    }
  };
  global.ProgressTransitionRegister = new Proxy(
    {} as ProgressTransitionRegister,
    {
      get: maybeThrowError,
      set: () => {
        maybeThrowError();
        return false;
      },
    }
  );
} else {
  runOnUIImmediately(() => {
    'worklet';
    global.ProgressTransitionRegister = createProgressTransitionRegister();
  })();
}

export type ProgressTransitionRegister = ReturnType<
  typeof createProgressTransitionRegister
>;
