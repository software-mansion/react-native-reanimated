import { ExamplesApp } from '@/components';

import { EXAMPLES } from './examples';

export default function App() {
  return (
    <ExamplesApp
      examples={EXAMPLES}
      headerTitle="🧵 Worklets examples"
      title="Worklets examples"
    />
  );
}
