import type { BannerZone } from '@swmansion/t-rex-ui';

export const TOP_BAR_BANNER = {
  rotateIntervalMs: 4000,
  hiddenPaths: [
    '/react-native-worklets/docs',
    '/react-native-worklets/search',
  ] as string[],
  zones: [
    {
      zoneId: 'react-native-worklets-topbar-1',
      contentId: 'ea15c4216158c4097b65fe6504a4b3b7',
      fallbackBgColor: '#ff6259',
    },
    {
      zoneId: 'react-native-worklets-topbar-2',
      contentId: 'ea15c4216158c4097b65fe6504a4b3b7',
      fallbackBgColor: '#ff6259',
    },
    {
      zoneId: 'react-native-worklets-topbar-3',
      contentId: 'ea15c4216158c4097b65fe6504a4b3b7',
      fallbackBgColor: '#ff6259',
    },
  ] satisfies BannerZone[],
};
