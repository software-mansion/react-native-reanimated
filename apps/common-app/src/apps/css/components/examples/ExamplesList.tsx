import type { ComponentType, JSX } from 'react';
import type { CSSAnimationProperties } from 'react-native-reanimated';

import { stringifyConfig } from '@/apps/css/utils';
import type { AnyRecord, PlainStyle } from '@/types';

import Scroll from '../layout/Scroll';
import { Section } from '../layout/Section';
import type { LabelType } from '../misc/Label';
import type { ExampleCardProps } from './ExampleCard';
import ExampleCard from './ExampleCard';

export type ExamplesListProps<P extends AnyRecord, S extends AnyRecord> = Pick<
  ExampleProps<P, S>,
  'buildAnimation' | 'renderExample'
> & {
  CardComponent?: ComponentType<ExampleCardProps>;
  sections: Array<{
    title: string;
    description?: Array<string> | string;
    labelTypes?: Array<LabelType>;
    CardComponent?: ComponentType<ExampleCardProps>;
    examples: Array<
      {
        CardComponent?: ComponentType<ExampleCardProps>;
      } & Omit<ExampleCardProps, 'children' | 'code' | 'collapsedCode'> &
        P
    >;
  }>;
};

export default function ExamplesList<
  P extends AnyRecord,
  S extends AnyRecord = PlainStyle,
>({
  buildAnimation,
  CardComponent = ExampleCard,
  renderExample,
  sections,
}: ExamplesListProps<P, S>) {
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
                key={exampleIndex}
                renderExample={renderExample}
                CardComponent={
                  exampleProps.CardComponent ??
                  SectionCardComponent ??
                  CardComponent
                }
              />
            ))}
          </Section>
        )
      )}
    </Scroll>
  );
}

type ExampleProps<P, S extends AnyRecord> = {
  CardComponent: ComponentType<ExampleCardProps>;
  denseCode?: boolean;
  buildAnimation: (props: P) => CSSAnimationProperties<S>;
  renderExample: (
    props: Omit<P, 'animation'> & { animation: CSSAnimationProperties<S> }
  ) => JSX.Element;
} & Omit<ExampleCardProps, 'code'> &
  P;

function Example<P extends AnyRecord, S extends AnyRecord>({
  buildAnimation,
  CardComponent,
  collapsedExampleHeight,
  denseCode = true,
  description,
  minExampleHeight,
  renderExample,
  showRestartButton,
  title,
  ...rest
}: ExampleProps<P, S>) {
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
      {renderExample({ ...userProps, animation })}
    </CardComponent>
  );
}
