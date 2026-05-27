import type { ComponentType, JSX } from 'react';
import type { CSSAnimationProperties } from 'react-native-reanimated';

import { stringifyConfig } from '@/apps/css/utils';
import type { AnyRecord } from '@/types';

import Scroll from '../layout/Scroll';
import { Section } from '../layout/Section';
import type { LabelType } from '../misc/Label';
import type { ExampleCardProps } from './ExampleCard';
import ExampleCard from './ExampleCard';

export type ExamplesListProps<
  TStyle extends AnyRecord,
  TExampleProps extends AnyRecord = object,
> = Pick<
  ExampleProps<TStyle, TExampleProps>,
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
        TExampleProps
    >;
  }>;
};

export default function ExamplesList<
  TStyle extends AnyRecord,
  TExampleProps extends AnyRecord = object,
>({
  buildAnimation,
  CardComponent = ExampleCard,
  renderExample,
  sections,
}: ExamplesListProps<TStyle, TExampleProps>) {
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

type ExampleProps<TStyle extends AnyRecord, TExampleProps> = {
  CardComponent: ComponentType<ExampleCardProps>;
  denseCode?: boolean;
  buildAnimation: (props: TExampleProps) => CSSAnimationProperties<TStyle>;
  renderExample: (
    props: Omit<TExampleProps, 'animation'> & {
      animation: CSSAnimationProperties<TStyle>;
    }
  ) => JSX.Element;
} & Omit<ExampleCardProps, 'code'> &
  TExampleProps;

function Example<TStyle extends AnyRecord, TExampleProps extends AnyRecord>({
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
}: ExampleProps<TStyle, TExampleProps>) {
  const userProps = rest as TExampleProps;
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
