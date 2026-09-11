/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
import 'react-native-worklets';
import React from 'react';

import type { Example } from '@/components';
import { REAPlatform } from '@/components';

const CopySerializablePerformanceTest: React.FC = () =>
  React.createElement(
    require('./CopySerializablePerformanceTest').default as React.FC
  );
const FetchExample: React.FC = () =>
  React.createElement(require('./FetchExample').default as React.FC);
const HermesSamplingProfilerExample: React.FC = () =>
  React.createElement(
    require('./HermesSamplingProfilerExample').default as React.FC
  );
const SynchronizablePerformanceExample: React.FC = () =>
  React.createElement(require('./SynchronizableExample').default as React.FC);
const SystraceSectionExample: React.FC = () =>
  React.createElement(require('./SystraceSectionExample').default as React.FC);

export const EXAMPLES: Record<string, Example> = {
  Synchronizable: {
    icon: '🔄',
    title: 'Synchronizable performance',
    screen: SynchronizablePerformanceExample,
    disabledPlatforms: [REAPlatform.WEB],
  },
  CopySerializablePerformanceTest: {
    icon: '🔄',
    title: 'Serializable performance',
    screen: CopySerializablePerformanceTest,
    disabledPlatforms: [REAPlatform.WEB],
  },
  FetchExample: {
    icon: '📡',
    title: 'Fetch & XHR (Bundle Mode)',
    screen: FetchExample,
    needsBundleMode: true,
  },
  HermesSamplingProfilerExample: {
    icon: '📊',
    title: 'Hermes sampling profiler',
    screen: HermesSamplingProfilerExample,
  },
  SystraceSectionExample: {
    icon: '📊',
    title: 'Systrace section',
    screen: SystraceSectionExample,
  },
};
