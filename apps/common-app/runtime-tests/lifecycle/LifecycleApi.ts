/**
 * A lifecycle scenario spans several JS sessions, because the host actions
 * between its phases (a reload of the React instance, for example) destroy the
 * JS runtime. `runtime-tests-server.js` therefore keeps the state of the run
 * and performs the host actions, and the app only runs one phase per session.
 */

export interface PhaseStep {
  type: 'phase';
  name: string;
  run: () => void | Promise<void>;
}

export interface ReloadStep {
  type: 'reload';
}

export type ScenarioStep = PhaseStep | ReloadStep;

export interface ScenarioOptions {
  /**
   * The library whose native module React Native invalidates first on a reload.
   * React Native invalidates the modules in the order in which they were first
   * requested, which depends on how the app starts. With this option the server
   * moves the module of that library to the front before each reload. The
   * module has to be initialized by then.
   */
  invalidateFirst?: 'reanimated' | 'worklets';
}

export interface Scenario extends ScenarioOptions {
  name: string;
  steps: ScenarioStep[];
}

const scenarios: Scenario[] = [];

export function scenario(
  name: string,
  steps: ScenarioStep[],
  options: ScenarioOptions = {}
) {
  if (scenarios.some((existing) => existing.name === name)) {
    throw new Error(`[Lifecycle] Duplicate scenario name: '${name}'.`);
  }
  scenarios.push({ name, steps, ...options });
}

/**
 * Code that runs in the app. It fails the scenario when it throws, and so does
 * any uncaught error.
 */
export function phase(
  name: string,
  run: () => void | Promise<void>
): PhaseStep {
  return { type: 'phase', name, run };
}

/**
 * Makes the server reload the React instance with `ReactHost.reload()`. The JS
 * that the previous phase started keeps running until React Native tears the
 * instance down. The scenario fails if the process does not survive.
 */
export function reload(): ReloadStep {
  return { type: 'reload' };
}

export function getScenarios(): readonly Scenario[] {
  return scenarios;
}
