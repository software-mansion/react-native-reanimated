import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { CSSTransitionConfig, StyleProps } from 'react-native-reanimated';

import { Screen, Scroll, Section, Stagger, TabView } from '@/components';
import { TransitionConfiguration } from '@/examples/transitions/components';

import type { ExampleItemProps } from './ExamplesListCard';
import ExamplesListCard from './ExamplesListCard';

type ExampleCardsSection = {
  title: string;
  items: Array<ExampleItemProps>;
  description?: ReactNode;
};

type ExampleScreenContentProps = {
  sharedConfig: Partial<CSSTransitionConfig>;
  cards: Array<ExampleCardsSection>;
  transitionStyles: Array<StyleProps>;
  displayStyleChanges?: boolean;
  renderExample: (
    config: CSSTransitionConfig,
    style: StyleProps
  ) => JSX.Element;
};

function ExampleScreenContent({
  cards,
  displayStyleChanges = false,
  renderExample,
  sharedConfig,
  transitionStyles,
}: ExampleScreenContentProps) {
  const configOverrides = useMemo(
    () => cards.flatMap((card) => card.items),
    [cards]
  );

  return (
    <Scroll withBottomBarSpacing>
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
    </Scroll>
  );
}

type ExampleScreenProps =
  | {
      tabs: Array<
        {
          name: string;
        } & ExampleScreenContentProps
      >;
    }
  | ExampleScreenContentProps;

export default function ExampleScreen(props: ExampleScreenProps) {
  if ('tabs' in props) {
    return (
      <Screen>
        <TabView>
          {props.tabs.map((tab) => (
            <TabView.Tab key={tab.name} name={tab.name}>
              <ExampleScreenContent {...tab} />
            </TabView.Tab>
          ))}
        </TabView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ExampleScreenContent {...props} />
    </Screen>
  );
}
