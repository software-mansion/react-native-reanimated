export interface Animation {
  onFrame: (animation?: unknown, timestamp?: number) => unknown; // TODO
  onStart: (
    nextAnimation: Animation,
    current: unknown,
    timestamp: number,
    previousAnimation: Animation
  ) => unknown; // TODO
  current: number | string; // TODO
  callback?: AnimationCallback;
  isHigherOrder?: boolean;
}

export interface AnimationConfig {
  tmp?: unknown;
} // TODO

export type AnimationCallback = (finished?: boolean) => unknown; // TODO

export type NextAnimation = Animation | (() => Animation);

export type SharedValue = {
  // TODO: just temporary mock
  value: unknown;
};
