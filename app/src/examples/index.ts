import BokehExample from './BokehExample';
import BubblesExample from './BubblesExample';

interface Example {
  icon: string;
  title: string;
  screen: React.FC;
}

export const EXAMPLES: Record<string, Example> = {
  BokehExample: {
    icon: '✨',
    title: 'Bokeh',
    screen: BokehExample,
  },
  BubblesExample: {
    icon: '🫧',
    title: 'Bubbles',
    screen: BubblesExample,
  },
} as const;
