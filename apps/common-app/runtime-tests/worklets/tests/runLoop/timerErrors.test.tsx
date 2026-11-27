import {
  createWorkletRuntime,
  runOnRuntimeSync,
  scheduleOnRN,
  scheduleOnRuntime,
  scheduleOnUI,
} from 'react-native-worklets';

import {
  describe,
  expect,
  getWorkletRuntimesFromPool,
  notify,
  test,
  waitForNotification,
} from '../../../ReJest/RuntimeTestsApi';

const TIMER_ERROR = 'error thrown by a setTimeout callback';
const TIMER_MICROTASK_ERROR =
  'error thrown by a microtask of a setTimeout callback';
const INTERVAL_ERROR = 'error thrown by a setInterval callback';
const FRAME_ERROR = 'error thrown by a requestAnimationFrame callback';
const FRAME_CANCEL_ERROR =
  'error thrown by a requestAnimationFrame callback that cancels another one';
const FIRST_FRAME_ERROR = 'first error thrown in a frame';
const SECOND_FRAME_ERROR = 'second error thrown in a frame';
const REPEATED_FRAME_ERROR = 'error thrown by a callback in every frame';
const SINGLE_FRAME_ERROR = 'error thrown once next to a repeating error';
const REPEATED_FRAMES = 10;
const FRAME_MICROTASK_ERROR =
  'error thrown by a microtask of a requestAnimationFrame callback';
const CANCELLED_CALLBACK_NOTIFICATION = 'CANCELLED_FRAME_CALLBACK_RESULT';
const ALIVE_NOTIFICATION = 'RUNTIME_ALIVE_AFTER_TIMER_ERROR';

describe('errors thrown by timer callbacks', () => {
  const [workletRuntime] = getWorkletRuntimesFromPool(1);
  const debugTest = __DEV__ ? test : test.skip;

  const onAlive = () => {
    notify(ALIVE_NOTIFICATION);
  };

  debugTest(
    'reports an error thrown by a setTimeout callback on a Worker Runtime',
    async () => {
      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          setTimeout(() => {
            throw new Error(TIMER_ERROR);
          });
        });
      }).toThrow(TIMER_ERROR);

      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        setTimeout(() => {
          scheduleOnRN(onAlive);
        });
      });
      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );

  debugTest(
    'reports an error thrown by a microtask queued in a setTimeout callback on a Worker Runtime',
    async () => {
      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          setTimeout(() => {
            queueMicrotask(() => {
              throw new Error(TIMER_MICROTASK_ERROR);
            });
          });
        });
      }).toThrow(TIMER_MICROTASK_ERROR);

      scheduleOnRuntime(workletRuntime, () => {
        'worklet';
        setTimeout(() => {
          scheduleOnRN(onAlive);
        });
      });
      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );

  debugTest(
    'keeps firing a setInterval whose callback throws on a Worker Runtime',
    async () => {
      await expect(() => {
        scheduleOnRuntime(workletRuntime, () => {
          'worklet';
          let calls = 0;
          const intervalId = setInterval(() => {
            calls++;
            if (calls === 1) {
              throw new Error(INTERVAL_ERROR);
            }
            if (calls === 3) {
              clearInterval(intervalId);
              scheduleOnRN(onAlive);
            }
          }, 10);
        });
      }).toThrow(INTERVAL_ERROR);

      await waitForNotification(ALIVE_NOTIFICATION);
    }
  );

  debugTest(
    'removes a setTimeout callback that throws from the timer bookkeeping on a Worker Runtime',
    async () => {
      const runtime = createWorkletRuntime({ name: 'timer-errors-leak' });
      await expect(() => {
        scheduleOnRuntime(runtime, () => {
          'worklet';
          setTimeout(() => {
            throw new Error(TIMER_ERROR);
          });
        });
      }).toThrow(TIMER_ERROR);

      const pendingCallbacks = runOnRuntimeSync(runtime, () => {
        'worklet';
        return (
          globalThis as unknown as {
            _taskQueue: { timeoutCallbacks: Map<number, unknown> };
          }
        )._taskQueue.timeoutCallbacks.size;
      });

      expect(pendingCallbacks).toBe(0);
    }
  );

  for (const runtimeName of ['UI', 'Worker'] as const) {
    const runOnTarget = (worklet: () => void) => {
      if (runtimeName === 'UI') {
        scheduleOnUI(worklet);
      } else {
        scheduleOnRuntime(workletRuntime, worklet);
      }
    };

    debugTest(
      `runs the other requestAnimationFrame callbacks of a frame when one throws on the ${runtimeName} Runtime`,
      async () => {
        await expect(() => {
          runOnTarget(() => {
            'worklet';
            requestAnimationFrame(() => {
              throw new Error(FRAME_ERROR);
            });
            requestAnimationFrame(() => {
              scheduleOnRN(onAlive);
            });
          });
        }).toThrow(FRAME_ERROR);

        await waitForNotification(ALIVE_NOTIFICATION);
      }
    );

    debugTest(
      `reports every error thrown by the requestAnimationFrame callbacks of one frame on the ${runtimeName} Runtime`,
      async () => {
        const messages = await captureReportedErrors(2, () => {
          runOnTarget(() => {
            'worklet';
            requestAnimationFrame(() => {
              throw new Error(FIRST_FRAME_ERROR);
            });
            requestAnimationFrame(() => {
              throw new Error(SECOND_FRAME_ERROR);
            });
          });
        });

        expect(
          messages.some((message) => message.includes(FIRST_FRAME_ERROR))
        ).toBe(true);
        expect(
          messages.some((message) => message.includes(SECOND_FRAME_ERROR))
        ).toBe(true);
      }
    );

    debugTest(
      `reports a second error of a frame while another callback keeps throwing on the ${runtimeName} Runtime`,
      async () => {
        const messages = await captureReportedErrors(
          REPEATED_FRAMES + 1,
          () => {
            runOnTarget(() => {
              'worklet';
              let frame = 0;
              const repeatingCallback = () => {
                frame++;
                if (frame < REPEATED_FRAMES) {
                  requestAnimationFrame(repeatingCallback);
                }
                throw new Error(`${REPEATED_FRAME_ERROR} ${frame}`);
              };
              requestAnimationFrame(repeatingCallback);
              requestAnimationFrame(() => {
                throw new Error(SINGLE_FRAME_ERROR);
              });
            });
          }
        );

        const singleErrorIndex = messages.findIndex((message) =>
          message.includes(SINGLE_FRAME_ERROR)
        );
        const lastRepeatedErrorIndex = messages.findIndex((message) =>
          message.includes(`${REPEATED_FRAME_ERROR} ${REPEATED_FRAMES}`)
        );
        expect(singleErrorIndex !== -1).toBe(true);
        expect(
          lastRepeatedErrorIndex === -1 ||
            singleErrorIndex < lastRepeatedErrorIndex
        ).toBe(true);
      }
    );

    debugTest(
      `runs the microtasks of a throwing requestAnimationFrame callback before the next callback of the frame on the ${runtimeName} Runtime`,
      async () => {
        let cancelledCallbackRan: boolean | null = null;
        const onResult = (ran: boolean) => {
          cancelledCallbackRan = ran;
          notify(CANCELLED_CALLBACK_NOTIFICATION);
        };

        await expect(() => {
          runOnTarget(() => {
            'worklet';
            let ran = false;
            requestAnimationFrame(() => {
              queueMicrotask(() => {
                cancelAnimationFrame(cancelledHandle);
              });
              throw new Error(FRAME_CANCEL_ERROR);
            });
            const cancelledHandle = requestAnimationFrame(() => {
              ran = true;
            });
            requestAnimationFrame(() => {
              scheduleOnRN(onResult, ran);
            });
          });
        }).toThrow(FRAME_CANCEL_ERROR);

        await waitForNotification(CANCELLED_CALLBACK_NOTIFICATION);
        expect(cancelledCallbackRan).toBe(false);
      }
    );

    debugTest(
      `runs the remaining microtasks of a requestAnimationFrame callback after one of them throws, before the next callback, on the ${runtimeName} Runtime`,
      async () => {
        let cancelledCallbackRan: boolean | null = null;
        const onResult = (ran: boolean) => {
          cancelledCallbackRan = ran;
          notify(CANCELLED_CALLBACK_NOTIFICATION);
        };

        await expect(() => {
          runOnTarget(() => {
            'worklet';
            let ran = false;
            requestAnimationFrame(() => {
              queueMicrotask(() => {
                throw new Error(FRAME_MICROTASK_ERROR);
              });
              queueMicrotask(() => {
                cancelAnimationFrame(cancelledHandle);
              });
            });
            const cancelledHandle = requestAnimationFrame(() => {
              ran = true;
            });
            requestAnimationFrame(() => {
              scheduleOnRN(onResult, ran);
            });
          });
        }).toThrow(FRAME_MICROTASK_ERROR);

        await waitForNotification(CANCELLED_CALLBACK_NOTIFICATION);
        expect(cancelledCallbackRan).toBe(false);
      }
    );
  }
});

type ErrorHandler = (error: Error, isFatal?: boolean) => void;

async function captureReportedErrors(
  count: number,
  run: () => void
): Promise<string[]> {
  const errorUtils = (
    globalThis as {
      ErrorUtils?: {
        getGlobalHandler: () => ErrorHandler;
        setGlobalHandler: (handler: ErrorHandler) => void;
      };
    }
  ).ErrorUtils;
  const messages: string[] = [];
  const previousHandler = errorUtils?.getGlobalHandler();
  errorUtils?.setGlobalHandler((error) => {
    messages.push(error?.message ?? String(error));
  });
  try {
    run();
    const deadline = Date.now() + 2000;
    while (messages.length < count && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  } finally {
    if (previousHandler) {
      errorUtils?.setGlobalHandler(previousHandler);
    }
  }
  return messages;
}
