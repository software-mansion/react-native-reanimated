export function* foo() {
  return yield 42;
}

export default function* main() {
  const result = yield foo();
  yield console.log(result);
}
