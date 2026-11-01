import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const directory = join(__dirname, '../Common/cpp/reanimated/LayoutAnimations');
const differ = readFileSync(join(directory, 'PropsDiffer.cpp'), 'utf8');
const transitions = readFileSync(
  join(directory, 'SharedTransitions.cpp'),
  'utf8'
);
const copy = transitions
  .split('ShadowView LayoutAnimationsProxy::carrierViewWithStyleOf(')[1]
  .split('\nvoid LayoutAnimationsProxy::detachCarrier(')[0];
const methods = [
  ...differ.matchAll(
    /void PropsDiffer::(\w+)\([^]*?(?=\n(?:void|std::vector|inline|jsi::Object|bool) |\n} \/\/ namespace)/g
  ),
]
  .filter(
    ([, name]) =>
      !['diffFrame', 'diffTransform'].includes(name) &&
      differ
        .split('jsi::Object PropsDiffer::computeDiff')[1]
        .split('\n}')[0]
        .includes(`${name}(runtime);`)
  )
  .map(([body]) => body)
  .join('\n');

test('the Android carrier copies exactly the style keys that PropsDiffer animates', () => {
  const keys = transitions
    .split('constexpr std::array kAnimatedStyleProps{')[1]
    .split('};')[0];
  const copied = [...keys.matchAll(/"(\w+)"/g)].map(([, name]) => name);
  const transformOriginHelper = differ
    .split('void PropsDiffer::addTransformOriginToDiff(')[1]
    .split('\n}')[0];
  const animatesTransformOrigin =
    /\baddTransformOriginToDiff\(rt,/.test(methods) &&
    /jsiValues\.setProperty\(rt, "transformOrigin"/.test(transformOriginHelper);
  const animated = [
    ...[
      ...methods.matchAll(
        /(?:sourceValues_\.setProperty\(rt,|diffBorder\w+\([^;]*?)\s*"(\w+)"/g
      ),
    ].map(([, name]) => name),
    ...(animatesTransformOrigin ? ['transformOrigin'] : []),
  ];
  expect(sorted(copied)).toEqual(sorted(animated));
});

test('the iOS carrier copies the typed fields and border edges that PropsDiffer animates', () => {
  const fields = [...methods.matchAll(/sourceViewProps_\.(\w+)/g)]
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

test('the restart check covers the typed fields and border edges that PropsDiffer animates', () => {
  const check = differ
    .split('bool PropsDiffer::hasAnimatedChanges(')[1]
    .split('\nvoid PropsDiffer::diffFrame')[0];
  const animatedFields = [...methods.matchAll(/sourceViewProps_\.(\w+)/g)].map(
    ([, name]) => name
  );
  const checkedFields = [...check.matchAll(/sourceProps\.(\w+)/g)].map(
    ([, name]) => name
  );
  expect(sorted(checkedFields)).toEqual(
    sorted([...animatedFields, 'transform', 'boxShadow'])
  );
  for (const [animated, checked] of [
    ['sourceBorderRadii', 'sourceRadii'],
    ['sourceBorderWidths', 'sourceWidths'],
    ['sourceBorderColors', 'sourceColors'],
  ]) {
    const fields = (source: string, name: string) =>
      [...source.matchAll(new RegExp(`${name}\\.(\\w+)`, 'g'))].map(
        ([, field]) => field
      );
    expect(sorted(fields(check, checked))).toEqual(
      sorted(fields(methods, animated))
    );
  }
});

function sorted(values: Iterable<string>) {
  return [...new Set(values)].sort();
}
