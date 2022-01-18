module.exports = {
  docs: [
    {
      type: 'category',
      label: 'Fundamentals',
      items: [
        'fundamentals/about',
        'fundamentals/installation',
        'fundamentals/worklets',
        'fundamentals/shared-values',
        'fundamentals/animations',
        'fundamentals/events',
        'fundamentals/custom_events',
        'fundamentals/layout_animations',
        'fundamentals/architecture',
        'fundamentals/migration',
        'fundamentals/web-support',
        'fundamentals/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        {
          Hooks: [
            'api/hooks/useSharedValue',
            'api/hooks/useAnimatedStyle',
            'api/hooks/useDerivedValue',
            'api/hooks/useAnimatedScrollHandler',
            'api/hooks/useAnimatedGestureHandler',
            'api/hooks/useAnimatedRef',
            'api/hooks/useAnimatedReaction',
            'api/hooks/useAnimatedProps',
            'api/hooks/useHandler',
            'api/hooks/useEvent',
          ],
          Animations: [
            'api/animations/withTiming',
            'api/animations/withSpring',
            'api/animations/withDecay',
            'api/animations/cancelAnimation',
            'api/animations/withDelay',
            'api/animations/withSequence',
            'api/animations/withRepeat',
          ],
          'Native methods': [
            'api/nativeMethods/measure',
            'api/nativeMethods/scrollTo',
          ],
          'Layout Animations': [
            'api/LayoutAnimations/customAnimations',
            'api/LayoutAnimations/entryAnimations',
            'api/LayoutAnimations/exitAnimations',
            'api/LayoutAnimations/keyframeAnimations',
            'api/LayoutAnimations/layoutTransitions',
          ],
          Miscellaneous: [
            'api/miscellaneous/runOnJS',
            'api/miscellaneous/runOnUI',
            'api/miscellaneous/interpolate',
            'api/miscellaneous/getRelativeCoords',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: ['guide/testing'],
    },
    {
      type: 'category',
      label: 'Tutorials',
      items: ['tutorials/LayoutAnimations/layoutAnimations'],
    },
    {
      type: 'doc',
      id: 'community',
    },
  ],
};
