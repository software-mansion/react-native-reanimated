import type { PartialBy } from '@/types';

import { Screen } from '../layout/Screens';
import TabView from '../layout/TabView';
import type { ExamplesListProps } from './ExamplesList';
import ExamplesList from './ExamplesList';

type ExamplesScreenProps<
  TStyle extends object,
  TExampleProps extends object | Array<object>,
> =
  TExampleProps extends Array<infer T>
    ? T extends object
      ? DifferentTypeTabsScreenProps<TStyle, T>
      : never
    :
        | DifferentTypeTabsScreenProps<TStyle, TExampleProps>
        | ExamplesListProps<TStyle, TExampleProps>
        | SameTypeTabsScreenProps<TStyle, TExampleProps>;

type DifferentTypeTabsScreenProps<
  TStyle extends object,
  TExampleProps extends object,
> = {
  tabs: Array<{ name: string } & ExamplesListProps<TStyle, TExampleProps>>;
};

type PartialExamplesListProps<
  TStyle extends object,
  TExampleProps extends object,
  K extends keyof ExamplesListProps<TStyle, TExampleProps>,
> = {
  tabs: Array<
    { name: string } & PartialBy<ExamplesListProps<TStyle, TExampleProps>, K>
  >;
} & Pick<ExamplesListProps<TStyle, TExampleProps>, K>;

type SameTypeTabsScreenProps<
  TStyle extends object,
  TExampleProps extends object,
> =
  | PartialExamplesListProps<
      TStyle,
      TExampleProps,
      'buildAnimation' | 'renderExample'
    >
  | PartialExamplesListProps<TStyle, TExampleProps, 'buildAnimation'>
  | PartialExamplesListProps<TStyle, TExampleProps, 'renderExample'>;

export default function ExamplesScreen<
  TStyle extends object,
  TExampleProps extends object | Array<object> = object,
>(props: ExamplesScreenProps<TStyle, TExampleProps>) {
  if ('tabs' in props) {
    const renderTab = (
      name: string,
      {
        buildAnimation,
        renderExample,
        ...rest
      }: ExamplesListProps<TStyle, TExampleProps>
    ) => {
      return (
        <TabView.Tab name={name}>
          <ExamplesList
            {...props}
            {...rest}
            buildAnimation={
              buildAnimation ??
              ('buildAnimation' in props
                ? props.buildAnimation
                : () => ({ animationName: {} }))
            }
            renderExample={
              renderExample ??
              ('renderExample' in props ? props.renderExample : () => <></>)
            }
          />
        </TabView.Tab>
      );
    };

    return (
      <Screen>
        <TabView>
          {props.tabs.map(({ name, ...rest }) =>
            renderTab(name, rest as ExamplesListProps<TStyle, TExampleProps>)
          )}
        </TabView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ExamplesList {...props} />
    </Screen>
  );
}
