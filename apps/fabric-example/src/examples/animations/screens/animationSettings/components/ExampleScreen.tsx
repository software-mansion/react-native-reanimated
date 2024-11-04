import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { CSSAnimationConfig } from 'react-native-reanimated';

import {
  ConfigWithOverridesBlock,
  Screen,
  Scroll,
  Section,
  Stagger,
  TabView,
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

type ExampleScreenProps =
  | {
      tabs: Array<
        {
          name: string;
        } & ExampleScreenContentProps
      >;
    }
  | ExampleScreenContentProps;

function ExampleScreenContent({
  cards,
  config,
  renderExample,
}: ExampleScreenContentProps) {
  const configOverrides = useMemo(
    () => cards?.flatMap((card) => card.items),
    [cards]
  );

  return (
    <Scroll withBottomBarSpacing>
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
    </Scroll>
  );
}

type ExampleScreenContentProps = {
  config: CSSAnimationConfig;
  cards: Array<ExampleCardSection>;
  renderExample: (config: CSSAnimationConfig) => JSX.Element;
};

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
