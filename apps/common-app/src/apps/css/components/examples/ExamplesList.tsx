import type { ComponentType, JSX } from 'react';
import type { CSSAnimationProperties } from 'react-native-reanimated';

import { stringifyConfig } from '@/apps/css/utils';

import Scroll from '../layout/Scroll';
import { Section } from '../layout/Section';
import type { LabelType } from '../misc/Label';
import type { ExampleCardProps } from './ExampleCard';
import ExampleCard from './ExampleCard';

export type ExamplesListProps<
  TStyle extends object,
  TExampleProps extends object = object,
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
  TStyle extends object,
  TExampleProps extends object = object,
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

type ExampleProps<TStyle extends object, TExampleProps> = {
  CardComponent: ComponentType<ExampleCardProps>;
  denseCode?: boolean;
  // `NoInfer` keeps `buildAnimation`'s body from contributing to `TStyle`
  // inference - the keyframes literal is often narrow and would otherwise
  // hijack inference. `TStyle` is instead solved from `renderExample`'s
  // contextual flow (i.e. the component the user passes `animation` to).
  buildAnimation: (
    props: TExampleProps
  ) => CSSAnimationProperties<NoInfer<TStyle>>;
  renderExample: (
    props: Omit<TExampleProps, 'animation'> & {
      animation: CSSAnimationProperties<TStyle>;
    }
  ) => JSX.Element;
} & Omit<ExampleCardProps, 'code'> &
  TExampleProps;

function Example<TStyle extends object, TExampleProps extends object>({
  buildAnimation,
  CardComponent,
  collapsedExampleHeight,
  denseCode = true,
  description,
  labelTypes,
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
      labelTypes={labelTypes}
      minExampleHeight={minExampleHeight}
      showRestartButton={showRestartButton}
      title={title}>
      {renderExample({ ...userProps, animation })}
    </CardComponent>
  );
}
