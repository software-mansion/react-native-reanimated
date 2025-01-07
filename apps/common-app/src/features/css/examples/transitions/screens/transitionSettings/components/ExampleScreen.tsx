import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type {
  CSSTransitionProperties,
  StyleProps,
} from 'react-native-reanimated';

import type { LabelType } from '~/css/components';
import { Screen, Scroll, Section, Stagger, TabView } from '~/css/components';
import { TransitionConfiguration } from '~/css/examples/transitions/components';

import type { ExampleItemProps } from './ExamplesListCard';
import ExamplesListCard from './ExamplesListCard';

type ExampleCardsSection = {
  title: string;
  items: Array<ExampleItemProps>;
  description?: ReactNode;
  labelTypes?: Array<LabelType>;
};

type ExampleScreenContentProps = {
  transitionProperties: Partial<CSSTransitionProperties>;
  cards: Array<ExampleCardsSection>;
  transitionStyles: Array<StyleProps>;
  displayStyleChanges?: boolean;
  renderExample: (
    transition: CSSTransitionProperties,
    style: StyleProps
  ) => JSX.Element;
};

function ExampleScreenContent({
  cards,
  displayStyleChanges = false,
  renderExample,
  transitionProperties,
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
            labelTypes={card.labelTypes}
            title={card.title}>
            <ExamplesListCard
              displayStyleChanges={displayStyleChanges}
              items={card.items}
              renderExample={renderExample}
              transitionProperties={transitionProperties}
              transitionStyles={transitionStyles}
            />
          </Section>
        ))}

        <Section
          description="Transition configuration consists of the style changes that will be animated and the transition settings."
          title="Transition configuration">
          <TransitionConfiguration
            overrides={configOverrides}
            transitionProperties={transitionProperties}
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
