import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { CSSAnimationConfig } from 'react-native-reanimated';

import {
  ConfigWithOverridesBlock,
  ScrollScreen,
  Section,
  Stagger,
} from '@/components';

import type { ExampleItemProps } from './ExamplesListCard';
import ExamplesListCard from './ExamplesListCard';

type ExampleCardSection = {
  title: string;
  items: Array<ExampleItemProps>;
  description?: ReactNode;
  allowPause?: boolean;
  onTogglePause?: (paused: boolean) => void;
};

type ExampleScreenProps = {
  config: CSSAnimationConfig;
  cards: Array<ExampleCardSection>;
  renderExample: (config: CSSAnimationConfig) => JSX.Element;
};

export default function ExampleScreen({
  cards,
  config,
  renderExample,
}: ExampleScreenProps) {
  const configOverrides = useMemo(
    () => cards.flatMap((card) => card.items),
    [cards]
  );

  return (
    <ScrollScreen>
      <Stagger>
        {cards.map((card) => (
          <Section
            description={card.description}
            key={card.title}
            title={card.title}>
            <ExamplesListCard
              allowPause={card.allowPause}
              config={config}
              items={card.items}
              renderExample={renderExample}
              onTogglePause={card.onTogglePause}
            />
          </Section>
        ))}

        <Section
          description="Animation configuration shared between examples."
          title="Animation configuration">
          <ConfigWithOverridesBlock
            overrides={configOverrides}
            sharedConfig={config}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}
