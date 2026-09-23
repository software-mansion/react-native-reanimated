import './types';

import { ExamplesApp } from '@/components';

import { EXAMPLES } from './examples';

export default function App() {
  return (
    <ExamplesApp
      examples={EXAMPLES}
      headerTitle="🐎 Reanimated examples"
      title="Reanimated examples"
    />
  );
}
