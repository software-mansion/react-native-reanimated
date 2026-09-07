import {
  createSerializable,
  getUIRuntimeHolder,
  getUISchedulerHolder,
} from 'react-native-worklets';

import NativeTouchBoxModule from '../specs/NativeTouchBoxModule';

export type TouchEvent = {
  x: number;
  y: number;
  time: number;
  phase: 'began' | 'moved' | 'ended' | 'decay';
};

export type Limits = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type BoxState = {
  translateX: number;
  translateY: number;
  rotate: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originRotate: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  velocityX: number;
  velocityY: number;
  decaying: boolean;
};

export type TouchBoxController = {
  id: number;
  setHandler: (serialized: unknown) => void;
};

let installed = false;

export function createController(): TouchBoxController {
  const globals = globalThis as unknown as Record<string, unknown>;

  if (!installed) {
    globals.__UI_WORKLET_RUNTIME_HOLDER = getUIRuntimeHolder();
    globals.__UI_SCHEDULER_HOLDER = getUISchedulerHolder();
    NativeTouchBoxModule.install();
    delete globals.__UI_WORKLET_RUNTIME_HOLDER;
    delete globals.__UI_SCHEDULER_HOLDER;
    installed = true;
  }

  return (globals.__createTouchBoxController as () => TouchBoxController)();
}

export function attachHandler(
  controller: TouchBoxController,
  handler: (touch: TouchEvent, state?: BoxState) => BoxState
) {
  const attach = (applyState: (state: BoxState) => void) => {
    'worklet';
    let current: BoxState | undefined;

    const advance = (touch: TouchEvent) => {
      current = handler({ ...touch, time: performance.now() / 1000 }, current);
      applyState(current);
    };

    return (touch: TouchEvent) => {
      advance(touch);

      if (touch.phase !== 'ended') {
        return;
      }

      const step = () => {
        advance({ ...touch, phase: 'decay' });

        if (current?.decaying) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };
  };

  controller.setHandler(createSerializable(attach));
}
