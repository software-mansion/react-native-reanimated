import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Page } from '@playwright/test';
import ts from 'typescript';

export const EFFECT_DURATION_SECONDS = 10;

export type CancellationScenario =
  | 'remove-elements'
  | 'remove-during-animation-event'
  | 'hide-elements-after-scheduling-cleanup';

type CancellationPayload = { name: string; elapsedTime: number };

export type CancellationLog = {
  nativeNames: string[];
  callbackNames: string[];
  elapsedTimes: number[];
};

type BrowserListenerConstructor = new <Payload>(
  element: HTMLElement,
  events: { cancel: string },
  buildPayload: (event: Event) => Payload
) => {
  sync(callbacks: { cancel: (payload: Payload) => void }): void;
  scheduleDetach(): void;
};

export async function prepareCancellationPage(page: Page) {
  await page.setContent(`<style>
    @keyframes fade { from { opacity: .2 } to { opacity: .8 } }
    @keyframes slide { from { transform: translateX(0px) } to { transform: translateX(20px) } }
    @keyframes trigger { from { opacity: .9 } to { opacity: 1 } }
  </style>`);
  await page.addScriptTag({ content: listenerSource });
}

export async function runCancellationScenario(
  page: Page,
  scenario: CancellationScenario
) {
  // Keep the whole scenario in the browser. In particular, cleanup and DOM
  // removal must run synchronously in the same task or native event handler.
  return page.evaluate(runInBrowser, {
    scenario,
    durationSeconds: EFFECT_DURATION_SECONDS,
  });
}

async function runInBrowser({
  scenario,
  durationSeconds,
}: {
  scenario: CancellationScenario;
  durationSeconds: number;
}) {
  // Playwright serializes this function; its runtime helpers must live inside it.
  const Listener = (
    window as unknown as { CSSCallbackListeners: BrowserListenerConstructor }
  ).CSSCallbackListeners;

  function nextFrame() {
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    );
  }

  function waitForTwoEvents(element: HTMLElement, eventName: string) {
    return new Promise<void>((resolve) => {
      let count = 0;
      const listener = () => {
        if (++count === 2) {
          element.removeEventListener(eventName, listener);
          resolve();
        }
      };
      element.addEventListener(eventName, listener);
    });
  }

  function trackCancellations(
    element: HTMLElement,
    eventName: string,
    readPayload: (event: Event) => CancellationPayload
  ) {
    const log: CancellationLog = {
      nativeNames: [],
      callbackNames: [],
      elapsedTimes: [],
    };
    // This independent observer survives library cleanup, so a missing library
    // callback can be distinguished from a browser that never sent the event.
    element.addEventListener(eventName, (event) => {
      if (event.isTrusted) log.nativeNames.push(readPayload(event).name);
    });
    const listeners = new Listener(element, { cancel: eventName }, readPayload);
    listeners.sync({
      cancel: ({ name, elapsedTime }) => {
        log.callbackNames.push(name);
        log.elapsedTimes.push(elapsedTime);
      },
    });
    return { log, listeners };
  }

  async function startEffects() {
    const animationElement = document.createElement('div');
    animationElement.style.cssText = `width:20px;height:20px;animation:fade ${durationSeconds}s linear,slide ${durationSeconds}s linear`;
    const transitionElement = document.createElement('div');
    transitionElement.style.cssText = `opacity:1;transform:translateX(0px);transition:opacity ${durationSeconds}s linear,transform ${durationSeconds}s linear`;

    const animationsStarted = waitForTwoEvents(
      animationElement,
      'animationstart'
    );
    const transitionsStarted = waitForTwoEvents(
      transitionElement,
      'transitionrun'
    );
    const animations = trackCancellations(
      animationElement,
      'animationcancel',
      (event) => {
        const { animationName, elapsedTime } = event as AnimationEvent;
        return { name: animationName, elapsedTime };
      }
    );
    const transitions = trackCancellations(
      transitionElement,
      'transitioncancel',
      (event) => {
        const { propertyName, elapsedTime } = event as TransitionEvent;
        return { name: propertyName, elapsedTime };
      }
    );

    document.body.append(animationElement, transitionElement);
    await animationsStarted;
    await nextFrame();
    transitionElement.style.opacity = '.1';
    transitionElement.style.transform = 'translateX(100px)';
    await transitionsStarted;
    // The first rAF can share the rendering update that dispatched transitionrun.
    // Advance another frame so cancellation measures a positive active duration.
    await nextFrame();
    await nextFrame();
    return { animationElement, transitionElement, animations, transitions };
  }

  function duringAnimationEnd(action: () => void) {
    const trigger = document.createElement('div');
    trigger.style.animation = 'trigger 30ms linear';
    return new Promise<void>((resolve) => {
      trigger.addEventListener(
        'animationend',
        () => {
          action();
          trigger.remove();
          resolve();
        },
        { once: true }
      );
      document.body.append(trigger);
    });
  }

  const { animationElement, transitionElement, animations, transitions } =
    await startEffects();

  function scheduleCleanup() {
    animations.listeners.scheduleDetach();
    transitions.listeners.scheduleDetach();
  }

  function removeElements() {
    scheduleCleanup();
    animationElement.remove();
    transitionElement.remove();
  }

  switch (scenario) {
    case 'remove-elements':
      removeElements();
      break;
    case 'remove-during-animation-event':
      await duringAnimationEnd(removeElements);
      break;
    case 'hide-elements-after-scheduling-cleanup':
      scheduleCleanup();
      animationElement.style.display = 'none';
      transitionElement.style.display = 'none';
      break;
  }

  // Allow the two-frame cleanup and subsequent rendering updates to finish.
  for (let frame = 0; frame < 4; frame++) await nextFrame();

  // Keep both nodes reachable and send sentinels after cleanup. If a library
  // listener remains attached, these unexpected names make the assertions fail.
  animationElement.dispatchEvent(
    new AnimationEvent('animationcancel', { animationName: 'after-cleanup' })
  );
  transitionElement.dispatchEvent(
    new TransitionEvent('transitioncancel', { propertyName: 'after-cleanup' })
  );
  return { animations: animations.log, transitions: transitions.log };
}

function compileSource(relativePath: string) {
  const cssDirectory = path.resolve(
    __dirname,
    '../../../../packages/react-native-reanimated/src/css'
  );
  return ts.transpileModule(
    readFileSync(path.join(cssDirectory, relativePath), 'utf8'),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2021,
        module: ts.ModuleKind.CommonJS,
      },
    }
  ).outputText;
}

// Load the actual production classes, without mocking events or frame scheduling.
// The small CommonJS bridge supplies their one runtime dependency explicitly.
const listenerSource = `(() => {
  const store = { exports: {} };
  ((module, exports) => { ${compileSource('models/CSSCallbackStore.ts')} })(store, store.exports);
  const listeners = { exports: {} };
  ((module, exports, require) => { ${compileSource('web/managers/CSSCallbackListeners.ts')} })(
    listeners, listeners.exports, (name) => {
      if (name !== '../../models') throw new Error('Unexpected listener dependency: ' + name);
      return { CSSCallbackStore: store.exports.default };
    }
  );
  window.CSSCallbackListeners = listeners.exports.CSSCallbackListeners;
})();`;
