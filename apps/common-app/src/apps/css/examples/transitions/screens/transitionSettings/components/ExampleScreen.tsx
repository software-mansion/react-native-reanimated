import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type {
  CSSTransitionProperties,
  StyleProps,
} from 'react-native-reanimated';

import type { LabelType } from '@/apps/css/components';
import {
  Screen,
  Scroll,
  Section,
  Stagger,
  TabView,
} from '@/apps/css/components';
import { TransitionConfiguration } from '@/apps/css/examples/transitions/components';

import type { ExampleItemProps } from './ExamplesListCard';
import ExamplesListCard from './ExamplesListCard';

type ExampleCardsSection<S extends object> = {
  title: string;
  items: Array<ExampleItemProps<S>>;
  description?: ReactNode;
  labelTypes?: Array<LabelType>;
};

type ExampleScreenContentProps<S extends object> = {
  transitionProperties: Partial<CSSTransitionProperties<S>>;
  cards: Array<ExampleCardsSection<S>>;
  transitionStyles: Array<StyleProps>;
  displayStyleChanges?: boolean;
  renderExample: (
    transition: CSSTransitionProperties<S>,
    style: StyleProps
  ) => JSX.Element;
};

function ExampleScreenContent<S extends object>({
  cards,
  displayStyleChanges = false,
  renderExample,
  transitionProperties,
  transitionStyles,
}: ExampleScreenContentProps<S>) {
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

type ExampleScreenProps<S extends object> =
  | {
      tabs: Array<
        {
          name: string;
        } & ExampleScreenContentProps<S>
      >;
    }
  | ExampleScreenContentProps<S>;

export default function ExampleScreen<S extends object>(
  props: ExampleScreenProps<S>
) {
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
