import { Screen, TabView } from '@/components/layout';
import type { AnyRecord, PartialBy } from '@/types';

import type { ExamplesListProps } from './ExamplesList';
import ExamplesList from './ExamplesList';

type ExamplesScreenProps<P extends AnyRecord | Array<AnyRecord>> =
  P extends Array<infer T>
    ? T extends AnyRecord
      ? DifferentTypeTabsScreenProps<T>
      : never
    :
        | DifferentTypeTabsScreenProps<P>
        | ExamplesListProps<P>
        | SameTypeTabsScreenProps<P>;

type DifferentTypeTabsScreenProps<P extends AnyRecord> = {
  tabs: Array<{ name: string } & ExamplesListProps<P>>;
};

type SameTypeTabsScreenProps<P extends AnyRecord> = {
  tabs: Array<
    { name: string } & PartialBy<
      ExamplesListProps<P>,
      'buildConfig' | 'renderExample'
    >
  >;
} & Pick<ExamplesListProps<P>, 'buildConfig' | 'renderExample'>;

export default function ExamplesScreen<P extends AnyRecord | Array<AnyRecord>>(
  props: ExamplesScreenProps<P>
) {
  if ('tabs' in props) {
    return (
      <Screen>
        <TabView>
          {props.tabs.map(({ buildConfig, name, renderExample, ...rest }) => (
            <TabView.Tab key={name} name={name}>
              <ExamplesList
                {...props}
                {...rest}
                buildConfig={
                  buildConfig ??
                  ('buildConfig' in props
                    ? props.buildConfig
                    : () => ({ animationName: {} }))
                }
                renderExample={
                  renderExample ??
                  ('renderExample' in props ? props.renderExample : () => <></>)
                }
              />
            </TabView.Tab>
          ))}
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
