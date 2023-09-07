const siteMap = {
  fundamentals: [
    'installation',
    'worklets',
    'shared-values',
    'animations',
    'events',
    'custom_events',
    'layout_animations',
    'architecture',
    'migration',
    'web-support',
    'troubleshooting',
  ],
  animations: [
    'cancelAnimation',
    'withDecay',
    'withDelay',
    'withRepeat',
    'withSequence',
    'withSpring',
    'withTiming',
  ],
  hooks: [
    'useAnimatedGestureHandler',
    'useAnimatedKeyboard',
    'useAnimatedProps',
    'useAnimatedReaction',
    'useAnimatedRef',
    'useAnimatedScrollHandler',
    'useAnimatedSensor',
    'useAnimatedStyle',
    'useDerivedValue',
    'useEvent',
    'useFrameCallback',
    'useHandler',
    'useScrollViewOffset',
    'useSharedValue',
  ],
} as const;

const legacyVersions = [
  {
    from: '/docs/1.x.x',
    to: '/docs/1.x',
  },
  {
    from: '/docs/2.0.x',
    to: '/docs/2.x',
  },
  {
    from: '/docs/2.1.x',
    to: '/docs/2.x',
  },
  {
    from: '/docs/2.2.x',
    to: '/docs/2.x',
  },
  {
    from: '/docs/2.3.x',
    to: '/docs/2.x',
  },
];

function handleLegacyVersions(pathname: string): string {
  const redirect = legacyVersions.find(({ from }) => pathname.match(from));

  const redirectTo = redirect
    ? pathname.replace(redirect.from, redirect.to)
    : null;

  return redirectTo;
}

// Example pathname:
// '/react-native-reanimated/docs/2.0.x/installation'
// '/react-native-reanimated/docs/2.1.x/api/nativeMethods/measure#arguments'
function handleSiteMap(pathname: string): string {
  const id = pathname.split('#')[1] ?? '';
  const pathnameWithoutId = pathname.replace(/#.*/, '');

  const [page, ...rest] = pathnameWithoutId.split('/').reverse();
  const [section] =
    // @ts-ignore dunno tf is wrong here
    Object.entries(siteMap).find(([_, pages]) => pages.includes(page)) ?? [];

  if (!section) return pathname;

  let urlArr: string[] = [];
  if (rest.includes(section)) {
    urlArr = [page, ...rest];
  } else {
    urlArr = [page, section, ...rest];
  }

  const url = urlArr.reverse().join('/');
  return `${url}${id ? `#${id}` : ''}`;
}

// Returns null if pathname is not legacy and doesn't need to be redirected
export function mapLegacyUrl(pathname: string): string | null {
  const resolvedVersionPathname = handleLegacyVersions(pathname);

  if (!resolvedVersionPathname) return null;

  return handleSiteMap(resolvedVersionPathname);
}
