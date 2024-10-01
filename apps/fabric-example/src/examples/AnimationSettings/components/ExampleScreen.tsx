import type { CSSAnimationConfig } from 'react-native-reanimated';
import type { ExampleItemProps } from './ExamplesListCard';
import { Scroll, Stagger, Section, CodeBlock } from '../../../components';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { colors, spacing, radius } from '../../../theme';
import { StyleSheet, View } from 'react-native';
import ExamplesListCard from './ExamplesListCard';

type ExampleCardSection = {
  title: string;
  items: ExampleItemProps[];
  description?: ReactNode;
  allowPause?: boolean;
  onTogglePause?: (paused: boolean) => void;
};

type OverriddenProperties = {
  [key in keyof CSSAnimationConfig]: CSSAnimationConfig[key][];
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
  const allItems = useMemo(() => cards.flatMap((card) => card.items), [cards]);

  const overrides = useMemo<OverriddenProperties>(() => {
    const result = {} as OverriddenProperties;

    for (const item of allItems) {
      for (const key in item) {
        if (key !== 'label') {
          const k = key as keyof typeof result;
          if (!result[k]) {
            result[k] = [];
          }
          // @ts-expect-error - this is fine
          result[k].push(item[k].toString());
        }
      }
    }

    return result;
  }, [allItems]);

  const code = useMemo(() => {
    return (
      '{\n  ' +
      [...new Set([...Object.keys(config), ...Object.keys(overrides)])]
        .map((key) => {
          const k = key as keyof typeof config;
          const value = config[k] ?? overrides[k]?.[0] ?? '';
          let line = `${k}: ${JSON.stringify(value, null, 2)},`;
          if (
            overrides[k] &&
            (overrides[k].length > 1 || overrides[k][0] !== value)
          ) {
            line += ` // ${overrides[k].join(', ')}`;
          }
          return line;
        })
        .join('\n')
        .split('\n')
        .join('\n  ') +
      '\n}'
    );
  }, [config, overrides]);

  return (
    <Scroll>
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
          <View style={styles.codeBlock}>
            <CodeBlock code={code} />
          </View>
        </Section>
      </Stagger>
    </Scroll>
  );
}

const styles = StyleSheet.create({
  codeBlock: {
    backgroundColor: colors.background2,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
});
