import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = join(__dirname, '../Common/cpp/reanimated/LayoutAnimations');
const factory = readFileSync(
  join(directory, 'SharedTransitionValuesFactory.cpp'),
  'utf8'
);
const transitions = readFileSync(
  join(directory, 'SharedTransitions.cpp'),
  'utf8'
);
const copy = transitions
  .split('ShadowView LayoutAnimationsProxy::carrierViewWithStyleOf(')[1]
  .split('\nvoid LayoutAnimationsProxy::detachCarrier(')[0];
const creation = ['create', 'createGeometry']
  .map(
    (name) =>
      factory
        .split(`jsi::Object SharedTransitionValuesFactory::${name}(`)[1]
        .split('\n}')[0]
  )
  .join('\n');
const methods = [
  ...factory.matchAll(
    /void SharedTransitionValuesFactory::(\w+)\([^]*?(?=\n(?:void|std::vector|inline|jsi::Object|bool) |\n} \/\/ namespace)/g
  ),
]
  .filter(
    ([, name]) =>
      !['writeFrame', 'writeTransform'].includes(name) &&
      creation.includes(`${name}(values,`)
  )
  .map(([body]) => body)
  .join('\n');

test('the Android carrier copies exactly the style keys that SharedTransitionValuesFactory animates', () => {
  const keys = transitions
    .split('constexpr std::array kAnimatedStyleProps{')[1]
    .split('};')[0];
  const copied = [...keys.matchAll(/"(\w+)"/g)].map(([, name]) => name);
  const animated = [...methods.matchAll(/"current(\w)(\w*)"/g)].map(
    ([, first, rest]) => first.toLowerCase() + rest
  );
  expect(sorted(copied)).toEqual(sorted(animated));
});

test('the iOS carrier copies the typed fields and border edges that SharedTransitionValuesFactory animates', () => {
  const fields = [...methods.matchAll(/sourceViewProps\.(\w+)/g)]
    .map(([, name]) => name)
    .filter((name) => !['getBorderWidths', 'elevation'].includes(name));
  const copied = [...copy.matchAll(/viewProps\.(\w+) = sourceProps\./g)].map(
    ([, name]) => name
  );
  expect(sorted(copied)).toEqual(sorted([...fields, 'boxShadow']));
  const widths = [...methods.matchAll(/sourceBorderWidths\.(\w+)/g)].map(
    ([, name]) => name.toLowerCase()
  );
  const edges = [...copy.matchAll(/facebook::yoga::Edge::(\w+)/g)].map(
    ([, name]) => name.toLowerCase()
  );
  expect(sorted(edges)).toEqual(sorted(widths));
});

test('the restart check covers the typed fields and border edges that SharedTransitionValuesFactory animates', () => {
  const check = factory
    .split('bool SharedTransitionValuesFactory::hasAnimatedChanges(')[1]
    .split('\njsi::Object SharedTransitionValuesFactory::create(')[0];
  const animatedFields = [...methods.matchAll(/sourceViewProps\.(\w+)/g)].map(
    ([, name]) => name
  );
  const checkedFields = [...check.matchAll(/sourceProps\.(\w+)/g)].map(
    ([, name]) => name
  );
  expect(sorted(checkedFields)).toEqual(
    sorted([...animatedFields, 'transform', 'boxShadow'])
  );
  const targetFields = [...check.matchAll(/targetProps\.(\w+)/g)].map(
    ([, name]) => name
  );
  expect(sorted(targetFields)).toEqual(sorted(checkedFields));
  for (const [animated, checked, target] of [
    ['sourceBorderRadii', 'sourceRadii', 'targetRadii'],
    ['sourceBorderWidths', 'sourceWidths', 'targetWidths'],
    ['sourceBorderColors', 'sourceColors', 'targetColors'],
  ]) {
    const fields = (source: string, name: string) =>
      [...source.matchAll(new RegExp(`${name}\\.(\\w+)`, 'g'))].map(
        ([, field]) => field
      );
    expect(sorted(fields(check, checked))).toEqual(
      sorted(fields(methods, animated))
    );
    expect(sorted(fields(check, target))).toEqual(
      sorted(fields(check, checked))
    );
  }
});

function sorted(values: Iterable<string>) {
  return [...new Set(values)].sort();
}
