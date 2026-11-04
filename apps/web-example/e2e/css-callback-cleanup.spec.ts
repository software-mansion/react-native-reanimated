import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import ts from 'typescript';

type BrowserListenerConstructor = new <Payload>(
  element: HTMLElement,
  events: { cancel: string },
  buildPayload: (event: Event) => Payload
) => {
  sync(callbacks: { cancel: (payload: Payload) => void }): void;
  scheduleDetach(): void;
};

const scenarios = {
  direct: 'delivers cancellations before detaching listeners on DOM removal',
  event: 'delivers cancellations when removal runs inside animationend',
  'display-none': 'delivers cancellations when cleanup precedes display:none',
};

for (const [scenario, title] of Object.entries(scenarios)) {
  test(title, async ({ page }) => {
    const result = await cancelEffects(page, scenario);
    expect(result.nativeAnimations).toEqual(['fade', 'slide']);
    expect(result.nativeTransitions).toEqual(['opacity', 'transform']);
    expect(result.animationNames).toEqual(result.nativeAnimations);
    expect(result.propertyNames).toEqual(result.nativeTransitions);
    expect(result.elapsed).toHaveLength(4);
    for (const elapsed of result.elapsed) {
      expect(elapsed).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(10);
    }
  });
}

async function cancelEffects(page: Page, scenario: string) {
  await page.setContent(`<style>
      @keyframes fade { from { opacity: .2 } to { opacity: .8 } }
      @keyframes slide { from { transform: translateX(0px) } to { transform: translateX(20px) } }
      @keyframes trigger { from { opacity: .9 } to { opacity: 1 } }
    </style>`);
  await page.addScriptTag({ content: source });
  return page.evaluate(async (mode) => {
    const Listener = (
      window as unknown as {
        CSSCallbackListeners: BrowserListenerConstructor;
      }
    ).CSSCallbackListeners;
    const node = document.createElement('div');
    node.style.cssText =
      'width:20px;height:20px;animation:fade 10s linear,slide 10s linear';
    const transitions = document.createElement('div');
    transitions.style.cssText =
      'opacity:1;transform:translateX(0px);transition:opacity 10s linear,transform 10s linear';
    const waitForTwo = (element: HTMLElement, type: string) =>
      new Promise<void>((resolve) => {
        let count = 0;
        const listener = () => {
          if (++count === 2) {
            element.removeEventListener(type, listener);
            resolve();
          }
        };
        element.addEventListener(type, listener);
      });
    const started = waitForTwo(node, 'animationstart');
    const running = waitForTwo(transitions, 'transitionrun');
    const nativeAnimations: string[] = [];
    const nativeTransitions: string[] = [];
    // These observers survive library cleanup and detect late/missed delivery.
    node.addEventListener('animationcancel', (event) => {
      if (event.isTrusted) nativeAnimations.push(event.animationName);
    });
    transitions.addEventListener('transitioncancel', (event) => {
      if (event.isTrusted) nativeTransitions.push(event.propertyName);
    });
    const animationNames: string[] = [];
    const propertyNames: string[] = [];
    const elapsed: number[] = [];
    const animationListeners = new Listener(
      node,
      { cancel: 'animationcancel' },
      (e: Event) => e as AnimationEvent
    );
    const transitionListeners = new Listener(
      transitions,
      { cancel: 'transitioncancel' },
      (e: Event) => e as TransitionEvent
    );
    animationListeners.sync({
      cancel: (e: AnimationEvent) => {
        animationNames.push(e.animationName);
        elapsed.push(e.elapsedTime);
      },
    });
    transitionListeners.sync({
      cancel: (e: TransitionEvent) => {
        propertyNames.push(e.propertyName);
        elapsed.push(e.elapsedTime);
      },
    });
    const nextFrame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    document.body.append(node, transitions);
    await started;
    await nextFrame();
    transitions.style.opacity = '.1';
    transitions.style.transform = 'translateX(100px)';
    await running;
    // The first rAF may share the start event's rendering update.
    await nextFrame();
    await nextFrame();
    // Keep both detaches and DOM mutations synchronous, including in the event handler.
    const remove = () => {
      animationListeners.scheduleDetach();
      transitionListeners.scheduleDetach();
      if (mode === 'display-none') {
        // Explicit cleanup then hiding; this does not simulate React unmount.
        node.style.display = 'none';
        transitions.style.display = 'none';
      } else {
        node.remove();
        transitions.remove();
      }
    };
    if (mode === 'event') {
      const trigger = document.createElement('div');
      trigger.style.animation = 'trigger 30ms linear';
      await new Promise<void>((resolve) => {
        trigger.addEventListener(
          'animationend',
          () => {
            remove();
            trigger.remove();
            resolve();
          },
          { once: true }
        );
        document.body.append(trigger);
      });
    } else {
      remove();
    }
    for (let i = 0; i < 4; i++) await nextFrame();
    // Retained nodes must have no callback listeners after cleanup.
    node.dispatchEvent(
      new AnimationEvent('animationcancel', { animationName: 'unexpected' })
    );
    transitions.dispatchEvent(
      new TransitionEvent('transitioncancel', { propertyName: 'unexpected' })
    );
    return {
      nativeAnimations: nativeAnimations.sort(),
      nativeTransitions: nativeTransitions.sort(),
      animationNames: animationNames.sort(),
      propertyNames: propertyNames.sort(),
      elapsed,
    };
  }, scenario);
}

// Execute the real listener/store implementation in the browser, without
// substituting browser event dispatch or frame scheduling.
const managers = path.resolve(
  __dirname,
  '../../../packages/react-native-reanimated/src/css'
);
const compile = (file: string) =>
  ts.transpileModule(readFileSync(path.join(managers, file), 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
const source = `(() => {
  const store = { exports: {} };
  ((module, exports) => { ${compile('models/CSSCallbackStore.ts')} })(store, store.exports);
  const listeners = { exports: {} };
  ((module, exports, require) => { ${compile('web/managers/CSSCallbackListeners.ts')} })(
    listeners, listeners.exports, (name) => {
      if (name !== '../../models') throw new Error('Unexpected dependency: ' + name);
      return { CSSCallbackStore: store.exports.default };
    }
  );
  window.CSSCallbackListeners = listeners.exports.CSSCallbackListeners;
})();`;
