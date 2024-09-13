import type { CSSAnimationConfig } from 'react-native-reanimated';
import type { ExampleItemProps, ExampleListCardProps } from './ExampleListCard';
import {
  Scroll,
  Stagger,
  Section,
  ExampleListCard,
  ExpandableCodeBlock,
} from '../../../components';
import { useMemo } from 'react';

type ExampleCardSection = {
  title: string;
  description?: string;
  items: ExampleItemProps[];
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

  return (
    <Scroll>
      <Stagger>
        {cards.map((card) => (
          <Section
            key={card.title}
            title={card.title}
            description={card.description}>
            <ExampleListCard
              config={config}
              items={card.items}
              renderExample={renderExample}
            />
          </Section>
        ))}

        <Section
          title="Animation configuration"
          description="Animation configuration shared between examples.">
          <CodeBlock config={config} items={allItems} />
        </Section>
      </Stagger>
    </Scroll>
  );
}

type OverriddenProperties = {
  [key in keyof CSSAnimationConfig]: CSSAnimationConfig[key][];
};

type CodeBlockProps = Pick<ExampleListCardProps, 'config' | 'items'>;

function CodeBlock({ config, items }: CodeBlockProps) {
  const overrides = useMemo<OverriddenProperties>(() => {
    const result = {} as OverriddenProperties;

    for (const item of items) {
      for (const key in item) {
        if (key !== 'label') {
          const k = key as keyof typeof result;
          if (!result[k]) {
            result[k] = [];
          }
          // @ts-expect-error - this is fine
          result[k].push(item[k]);
        }
      }
    }

    return result;
  }, [items]);

  const expandedCode = useMemo(() => {
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
    <ExpandableCodeBlock
      expandedCode={expandedCode}
      collapsedCode={JSON.stringify(config.animationName, null, 2)}
      showExpandOverlay
    />
  );
}
