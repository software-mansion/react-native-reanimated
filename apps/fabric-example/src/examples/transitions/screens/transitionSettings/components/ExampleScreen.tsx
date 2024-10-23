import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ExampleItemProps } from './ExamplesListCard';
import type { CSSTransitionConfig, StyleProps } from 'react-native-reanimated';
import { ScrollScreen, Section, Stagger } from '../../../../../components';
import ExamplesListCard from './ExamplesListCard';
import { TransitionConfiguration } from '../../../components';

type ExampleCardsSection = {
  title: string;
  items: ExampleItemProps[];
  description?: ReactNode;
};

type ExampleScreenProps = {
  sharedConfig: Partial<CSSTransitionConfig>;
  cards: ExampleCardsSection[];
  transitionStyles: StyleProps[];
  displayStyleChanges?: boolean;
  renderExample: (
    config: CSSTransitionConfig,
    style: StyleProps
  ) => JSX.Element;
};

export default function ExampleScreen({
  sharedConfig,
  cards,
  transitionStyles,
  renderExample,
  displayStyleChanges = false,
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
            key={index}
            title={card.title}
            description={card.description}>
            <ExamplesListCard
              sharedConfig={sharedConfig}
              items={card.items}
              renderExample={renderExample}
              transitionStyles={transitionStyles}
              displayStyleChanges={displayStyleChanges}
            />
          </Section>
        ))}

        <Section
          title="Transition configuration"
          description="Transition configuration consists of the style changes that will be animated and the transition settings.">
          <TransitionConfiguration
            sharedConfig={sharedConfig}
            transitionStyles={transitionStyles}
            overrides={configOverrides}
          />
        </Section>
      </Stagger>
    </ScrollScreen>
  );
}
