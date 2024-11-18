// prettier-ignore
const oldDocsToNewDocsMap = {
  "/docs/fundamentals/animations": "/docs/fundamentals/your-first-animation",
  "/docs/fundamentals/web-support": "/docs/guides/web-support",

  "/docs/api/animations/cancelAnimation": "/docs/core/cancelAnimation",
  "/docs/api/animations/withDecay": "/docs/animations/withDecay",
  "/docs/api/animations/withDelay": "/docs/animations/withDelay",
  "/docs/api/animations/withRepeat": "/docs/animations/withRepeat",
  "/docs/api/animations/withSequence": "/docs/animations/withSequence",
  "/docs/api/animations/withSpring": "/docs/animations/withSpring",
  "/docs/api/animations/withTiming": "/docs/animations/withTiming",

  "/docs/api/hooks/useAnimatedKeyboard": "/docs/device/useAnimatedKeyboard",
  "/docs/api/hooks/useAnimatedProps": "/docs/core/useAnimatedProps",
  "/docs/api/hooks/useAnimatedReaction": "/docs/advanced/useAnimatedReaction",
  "/docs/api/hooks/useAnimatedRef": "/docs/core/useAnimatedRef",
  "/docs/api/hooks/useAnimatedScrollHandler": "/docs/scroll/useAnimatedScrollHandler",
  "/docs/api/hooks/useAnimatedSensor": "/docs/device/useAnimatedSensor",
  "/docs/api/hooks/useAnimatedStyle": "/docs/core/useAnimatedStyle",
  "/docs/api/hooks/useDerivedValue": "/docs/core/useDerivedValue",
  "/docs/api/hooks/useEvent": "/docs/advanced/useEvent",
  "/docs/api/hooks/useFrameCallback": "/docs/advanced/useFrameCallback",
  "/docs/api/hooks/useHandler": "/docs/advanced/useHandler",
  "/docs/api/hooks/useScrollViewOffset": "/docs/scroll/useScrollViewOffset",
  "/docs/api/hooks/useSharedValue": "/docs/core/useSharedValue",

  "/docs/api/LayoutAnimations/customAnimations": "/docs/layout-animations/custom-animations",
  "/docs/api/LayoutAnimations/entryAnimations": "/docs/layout-animations/entering-exiting-animations",
  "/docs/api/LayoutAnimations/exitAnimations": "/docs/layout-animations/entering-exiting-animations",
  "/docs/api/LayoutAnimations/keyframeAnimations": "/docs/layout-animations/keyframe-animations",
  "/docs/api/LayoutAnimations/layoutTransitions": "/docs/layout-animations/layout-transitions",

  "/docs/api/sharedElementTransitions": "/docs/shared-element-transitions/overview",

  "/docs/api/nativeMethods/measure": "/docs/advanced/measure",
  "/docs/api/nativeMethods/scrollTo": "/docs/scroll/scrollTo",
  "/docs/api/nativeMethods/dispatchCommand": "/docs/advanced/dispatchCommand",

  "/docs/api/miscellaneous/getRelativeCoords": "/docs/utilities/getRelativeCoords",
  "/docs/api/miscellaneous/interpolate": "/docs/utilities/interpolate",
  "/docs/api/miscellaneous/runOnJS": "/docs/threading/runOnJS",
  "/docs/api/miscellaneous/runOnUI": "/docs/threading/runOnUI",
  "/docs/api/miscellaneous/interpolateColors": "/docs/utilities/interpolateColors",

  "/docs/guide/testing": "/docs/guides/testing",
  "/docs/guide/debugging": "/docs/guides/debugging",
  "/docs/guide/migration-from-1.x": "/docs/guides/migration-from-1.x",
  "/docs/guide/migration-from-2.x": "/docs/guides/migration-from-2.x",
};

export function mapOldDocsToNewUrl(pathname: string): string | null {
  return oldDocsToNewDocsMap[pathname] || null;
}
