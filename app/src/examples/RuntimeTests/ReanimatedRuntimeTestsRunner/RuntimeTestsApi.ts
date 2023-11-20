import { makeMutable, runOnJS, runOnUI } from "react-native-reanimated";
import { TestRunner } from "./TestRunner";
import { TestComponent } from "./TestComponent";

const RunnerState = new TestRunner();

export function describe(name: string, buildSuite: () => void) {
  RunnerState.describe(name, buildSuite);
};

export function beforeAll(job: () => void) {
  RunnerState.beforeAll(job);
}

export function beforeEach(job: () => void) {
  RunnerState.beforeEach(job);
}

export function afterEach(job: () => void) {
  RunnerState.afterEach(job);
}

export function afterAll(job: () => void) {
  RunnerState.afterAll(job);
}

export function test(name: string, testCase: () => void) {
  RunnerState.test(name, testCase);
};

export async function render(component: any) {
  const renderLock = RunnerState.getRenderLock();
  renderLock.lock = true;
  RunnerState.render(component);
  return waitForPropertyValueChange(renderLock, "lock");
}

function waitForPropertyValueChange(targetObject, targetProperty, initialValue = true) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (targetObject[targetProperty] != initialValue) {
        clearInterval(interval);
        resolve(targetObject[targetProperty]);
      }
    }, 10);
  });
}

export function useTestRef(name: string): React.MutableRefObject<any> {
  return RunnerState.useTestRef(name);
}

export function getTestComponent(name: string): TestComponent {
  return RunnerState.getTestComponent(name);
}

export async function runTests() {
  await RunnerState.runTests();
}

export async function wait(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export function expect(value: any) {
  return RunnerState.expect(value);
};

export function setConfig({ render }: { render: (component: any) => void }) {
  RunnerState.configure({ render });
  return RunnerState.getRenderLock();
}

const uiState: any = makeMutable(0);
const lockObject = {
  lock: false
}
function unlock() {
  lockObject.lock = false;
}
async function runOnUiSync(worklet: () => void) {
  // uiState.value = 1;
  // console.log("a")
  // runOnUI(() => {
  //   "worklet";
  //   console.log("b")
  //   worklet();
  //   uiState._value = 2;
  // })();
  // while (uiState.value !== 2) {
  //   console.log("waiting")
  // }
  // console.log("c")
  // uiState.value = 0;
  lockObject.lock = true;
  runOnUI(() => {
    "worklet";
    worklet();
    runOnJS(unlock)();
  })();
  await waitForPropertyValueChange(lockObject, "lock", true);
}

export async function mockAnimationTimer() {
  await runOnUiSync(() => {
    "worklet";
    global.mockedAnimationTimestamp = 0;
    global.originalGetAnimationTimestamp = global._getAnimationTimestamp;
    global._getAnimationTimestamp = () => {
      const currentTimestamp = global.mockedAnimationTimestamp;
      global.__frameTimestamp = currentTimestamp;
      global.mockedAnimationTimestamp += 16;
      return currentTimestamp;
    };
    let originalRequestAnimationFrame = global.requestAnimationFrame;
    global.originalRequestAnimationFrame = originalRequestAnimationFrame;
    (global as any).requestAnimationFrame = (callback) => {
      originalRequestAnimationFrame(() => {
        callback(global._getAnimationTimestamp());
      });
    }
  })
}

export async function unmockAnimationTimer() {
  await runOnUiSync(() => {
    "worklet";
    if (global.originalGetAnimationTimestamp) {
      global._getAnimationTimestamp = global.originalGetAnimationTimestamp;
      global.originalGetAnimationTimestamp = undefined;
    }
    if (global.originalRequestAnimationFrame) {
      global.requestAnimationFrame = global.originalRequestAnimationFrame;
      global.originalRequestAnimationFrame = undefined;
    }
    if (global.mockedAnimationTimestamp) {
      global.mockedAnimationTimestamp = undefined;
    }
  });
}

export async function setAnimationTimestamp(timestamp: number) {
  await runOnUiSync(() => {
    "worklet";
    global.mockedAnimationTimestamp = timestamp;
  })
}

export async function advanceAnimationByTime(time: number) {
  await runOnUiSync(() => {
    "worklet";
    global.mockedAnimationTimestamp += time;
  })
}

export async function advanceAnimationByFrames(frameCount: number) {
  await runOnUiSync(() => {
    "worklet";
    global.mockedAnimationTimestamp += frameCount * 16;
  })
}

export async function recordAnimationUpdates(mergeOperations = true) {
  const updates = makeMutable<any>(null);
  await runOnUiSync(() => {
    "worklet";
    const originalUpdateProps = global._IS_FABRIC ? global._updatePropsFabric : global._updatePropsPaper;
    global.originalUpdateProps = originalUpdateProps;
    const mockedUpdateProps = mergeOperations
      ? (operations) => {
        if (updates.value == null) {
          updates.value = [];
        }
        const newUpdates: any = [];
        for (const operation of operations) {
          newUpdates.push(operation.updates);
        }
        for (const newUpdate of newUpdates) {
          updates.value.push(newUpdate);
        }
        updates.value = [...updates.value];
        originalUpdateProps(operations);
      }
      : (operations) => {
        if (updates.value == null) {
          updates.value = {};
        }
        for (const operation of operations) {
          if (updates.value[operation.tag] == undefined) {
            updates.value[operation.tag] = [];
          }
          updates.value[operation.tag].push(updates.value[operation.tag]);
        }
        updates.value = operations;
        originalUpdateProps(operations);
      };

    if (global._IS_FABRIC) {
      global._updatePropsFabric = mockedUpdateProps;
    } else {
      global._updatePropsPaper = mockedUpdateProps;
    }

    const originalNotifyAboutProgress = global._notifyAboutProgress;
    global.originalNotifyAboutProgress = originalNotifyAboutProgress;
    global._notifyAboutProgress = mergeOperations
      ? (tag, value, isSharedTransition) => {
        if (updates.value == null) {
          updates.value = [];
        }
        updates.value.push({... value});
        updates.value = [...updates.value];
        originalNotifyAboutProgress(tag, value, isSharedTransition);
      }
      : (tag, value, isSharedTransition) => {
        if (updates.value == null) {
          updates.value = {};
        }
        if (updates.value[tag] == undefined) {
          updates.value[tag] = [];
        }
        updates.value[tag].push(value);
        updates.value = { ...updates.value };
        originalNotifyAboutProgress(tag, value, isSharedTransition);
      }
  });
  return updates;
}

export async function stopRecordingAnimationUpdates() {
  await runOnUiSync(() => {
    "worklet";
    if (global.originalUpdateProps) {
      if (global._IS_FABRIC) {
        global._updatePropsFabric = global.originalUpdateProps;
      } else {
        global._updatePropsPaper = global.originalUpdateProps;
      }
      global.originalUpdateProps = undefined;
    }
    if (global.originalNotifyAboutProgress) {
      global._notifyAboutProgress = global.originalNotifyAboutProgress;
      global.originalNotifyAboutProgress = undefined;
    }
  });
}
