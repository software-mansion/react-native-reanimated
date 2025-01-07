import type { ComponentType } from 'react';
import type { CSSAnimationProperties } from 'react-native-reanimated';

import type { AnyRecord } from '@/types';
import { stringifyConfig } from '@/utils';

import Scroll from '../layout/Scroll';
import { Section } from '../layout/Section';
import type { LabelType } from '../misc/Label';
import type { ExampleCardProps } from './ExampleCard';
import ExampleCard from './ExampleCard';

export type ExamplesListProps<P extends AnyRecord> = {
  renderExample: (
    props: { animation: CSSAnimationProperties } & P
  ) => JSX.Element;
  buildAnimation: (props: P) => CSSAnimationProperties;
  CardComponent?: ComponentType<ExampleCardProps>;
  sections: Array<{
    title: string;
    description?: Array<string> | string;
    labelTypes?: Array<LabelType>;
    CardComponent?: ComponentType<ExampleCardProps>;
    examples: Array<
      Omit<ExampleCardProps, 'children' | 'code' | 'collapsedCode'> & P
    >;
  }>;
};

export default function ExamplesList<P extends AnyRecord>({
  CardComponent = ExampleCard,
  buildAnimation,
  renderExample,
  sections,
}: ExamplesListProps<P>) {
  return (
    <Scroll withBottomBarSpacing>
      {sections.map(
        (
          { CardComponent: SectionCardComponent, examples, ...sectionProps },
          index
        ) => (
          <Section {...sectionProps} key={index}>
            {examples.map((exampleProps, exampleIndex) => (
              <Example
                {...exampleProps}
                buildAnimation={buildAnimation}
                CardComponent={SectionCardComponent ?? CardComponent}
                key={exampleIndex}
                renderExample={renderExample}
              />
            ))}
          </Section>
        )
      )}
    </Scroll>
  );
}

type ExampleProps<P> = {
  CardComponent: ComponentType<ExampleCardProps>;
  denseCode?: boolean;
  buildAnimation: (props: P) => CSSAnimationProperties;
  renderExample: (
    props: { animation: CSSAnimationProperties } & P
  ) => JSX.Element;
} & Omit<ExampleCardProps, 'code'> &
  P;

function Example<P extends AnyRecord>({
  CardComponent,
  buildAnimation,
  collapsedExampleHeight,
  denseCode = true,
  description,
  minExampleHeight,
  renderExample,
  showRestartButton,
  title,
  ...rest
}: ExampleProps<P>) {
  const userProps = rest as P;
  const animation = buildAnimation(userProps);

  return (
    <CardComponent
      code={stringifyConfig(animation)}
      collapsedCode={stringifyConfig(animation.animationName, denseCode)}
      collapsedExampleHeight={collapsedExampleHeight}
      description={description}
      minExampleHeight={minExampleHeight}
      showRestartButton={showRestartButton}
      title={title}>
      {renderExample({ animation, ...userProps })}
    </CardComponent>
  );
}
