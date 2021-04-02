module.exports = {
  docs: [
    {
      type: 'category',
      label: 'Fundamentals',
      items: [
        'about',
        'installation',
        'worklets',
        'shared-values',
        'animations',
        'events',
        'architecture',
        'migration',
        'web-support',
        'troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        {
          Hooks: [
            'api/useSharedValue',
            'api/useAnimatedStyle',
            'api/useDerivedValue',
            'api/useAnimatedScrollHandler',
            'api/useAnimatedGestureHandler',
            'api/useAnimatedRef',
            'api/useAnimatedReaction',
            'api/useAnimatedProps',
          ],
          Animations: [
            'api/withTiming',
            'api/withSpring',
            'api/withDecay',
            'api/cancelAnimation',
            'api/withDelay',
            'api/withSequence',
            'api/withRepeat',
          ],
          'Native methods': [
            'api/nativeMethods/measure',
            'api/nativeMethods/scrollTo',
          ],
          Miscellaneous: ['api/runOnJS'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: ['testing'],
    },
  ],
};
