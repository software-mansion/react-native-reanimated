type Bar = unknown;

const foobar = 5;

const baz = 2;

function foo() {
  'worklet';
  return (foo() + foobar) as typeof foobar as Bar;
}
