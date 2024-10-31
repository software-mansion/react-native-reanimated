import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { CSSTransitionConfig, StyleProps } from 'react-native-reanimated';

import { ScrollScreen, Section, Stagger } from '@/components';
import { TransitionConfiguration } from '@/examples/transitions/components';

import type { ExampleItemProps } from './ExamplesListCard';
import ExamplesListCard from './ExamplesListCard';

type ExampleCardsSection = {
  title: string;
  items: Array<ExampleItemProps>;
  description?: ReactNode;
};

type ExampleScreenProps = {
  sharedConfig: Partial<CSSTransitionConfig>;
  cards: Array<ExampleCardsSection>;
  transitionStyles: Array<StyleProps>;
  displayStyleChanges?: boolean;
  renderExample: (
    config: CSSTransitionConfig,
    style: StyleProps
  ) => JSX.Element;
};

export default function ExampleScreen({
  cards,
  displayStyleChanges = false,
  renderExample,
  sharedConfig,
  transitionStyles,
}: ExampleScreenProps) {
  const configOverrides = useMemo(
    () => cards.flatMap((card) => card.items),
    [cards]
  );

  return (
    <ScrollScreen>
      <Stagger>
        {cards.map((card, index) => (
          <Section
            description={card.description}
            key={index}
            title={card.title}>
            <ExamplesListCard
              displayStyleChanges={displayStyleChanges}
              items={card.items}
              renderExample={renderExample}
              sharedConfig={sharedConfig}
              transitionStyles={transitionStyles}
            />
          </Section>
        ))}

        <Section
          description="Transition configuration consists of the style changes that will be animated and the transition settings."
          title="Transition configuration">
          <TransitionConfiguration
            overrides={configOverrides}
            sharedConfig={sharedConfig}
            transitionStyles={transitionStyles}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}
