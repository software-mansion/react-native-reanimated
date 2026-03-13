/* eslint-disable @typescript-eslint/no-unused-vars */
import { withDecay } from '../..';

function WithDecayTest() {
  // @ts-expect-error `rubberBandEffect=true` makes `clamp` required.
  const a = withDecay({ rubberBandEffect: true });

  const b = withDecay({ rubberBandEffect: false });

  const c = withDecay({ rubberBandEffect: true, clamp: [0, 1] });

  // @ts-expect-error `clamp` too short.
  const d = withDecay({ rubberBandEffect: true, clamp: [0] });

  // @ts-expect-error `clamp` too long.
  const e = withDecay({ rubberBandEffect: true, clamp: [0, 1, 2] });

  // @ts-expect-error When `rubberBandEffect` is false then `rubberBandFactor` should not be provided.
  const f = withDecay({ rubberBandEffect: false, rubberBandFactor: 3 });

  // @ts-expect-error When `rubberBandEffect` isn't provided then `rubberBandFactor` should not be provided.
  const f2 = withDecay({ rubberBandFactor: 3 });

  const g = withDecay({
    rubberBandEffect: true,
    clamp: [0, 1],
    rubberBandFactor: 3,
  });

  const rubberBandOn: boolean = Math.random() < 0.5;
  // @ts-expect-error  When `rubberBandEffect` is an unknown boolean user still has to pass clamp.
  const h = withDecay({ rubberBandEffect: rubberBandOn });

  const i = withDecay({ rubberBandEffect: rubberBandOn, clamp: [0, 1] });

  // @ts-expect-error Config is required
  const j = withDecay();

  const k = withDecay({});
}
