import type { AnyRecord, PartialBy, PlainStyle } from '@/types';

import { Screen } from '../layout/Screens';
import TabView from '../layout/TabView';
import type { ExamplesListProps } from './ExamplesList';
import ExamplesList from './ExamplesList';

type ExamplesScreenProps<
  P extends AnyRecord | Array<AnyRecord>,
  S extends AnyRecord,
> =
  P extends Array<infer T>
    ? T extends AnyRecord
      ? DifferentTypeTabsScreenProps<T, S>
      : never
    :
        | DifferentTypeTabsScreenProps<P, S>
        | ExamplesListProps<P, S>
        | SameTypeTabsScreenProps<P, S>;

type DifferentTypeTabsScreenProps<P extends AnyRecord, S extends AnyRecord> = {
  tabs: Array<{ name: string } & ExamplesListProps<P, S>>;
};

type PartialExamplesListProps<
  P extends AnyRecord,
  S extends AnyRecord,
  K extends keyof ExamplesListProps<P, S>,
> = {
  tabs: Array<{ name: string } & PartialBy<ExamplesListProps<P, S>, K>>;
} & Pick<ExamplesListProps<P, S>, K>;

type SameTypeTabsScreenProps<P extends AnyRecord, S extends AnyRecord> =
  | PartialExamplesListProps<P, S, 'buildAnimation' | 'renderExample'>
  | PartialExamplesListProps<P, S, 'buildAnimation'>
  | PartialExamplesListProps<P, S, 'renderExample'>;

export default function ExamplesScreen<
  P extends AnyRecord | Array<AnyRecord>,
  S extends AnyRecord = PlainStyle,
>(props: ExamplesScreenProps<P, S>) {
  if ('tabs' in props) {
    const renderTab = (
      name: string,
      { buildAnimation, renderExample, ...rest }: ExamplesListProps<P, S>
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
            renderTab(name, rest as ExamplesListProps<P, S>)
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
