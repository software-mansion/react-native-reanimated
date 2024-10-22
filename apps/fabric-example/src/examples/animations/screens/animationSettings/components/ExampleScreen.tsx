import type { CSSAnimationConfig } from 'react-native-reanimated';
import type { ExampleItemProps } from './ExamplesListCard';
import {
  Stagger,
  Section,
  ScrollScreen,
  ConfigWithOverridesBlock,
} from '../../../../../components';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import ExamplesListCard from './ExamplesListCard';

type ExampleCardSection = {
  title: string;
  items: ExampleItemProps[];
  description?: ReactNode;
  allowPause?: boolean;
  onTogglePause?: (paused: boolean) => void;
};

type ExampleScreenProps = {
  config: CSSAnimationConfig;
  cards: ExampleCardSection[];
  renderExample: (config: CSSAnimationConfig) => JSX.Element;
};

export default function ExampleScreen({
  config,
  cards,
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
            key={card.title}
            title={card.title}
            description={card.description}>
            <ExamplesListCard
              config={config}
              items={card.items}
              renderExample={renderExample}
              allowPause={card.allowPause}
              onTogglePause={card.onTogglePause}
            />
          </Section>
        ))}

        <Section
          title="Animation configuration"
          description="Animation configuration shared between examples.">
          <ConfigWithOverridesBlock
            sharedConfig={config}
            overrides={configOverrides}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}
