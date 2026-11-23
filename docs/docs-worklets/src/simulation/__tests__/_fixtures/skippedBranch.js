export default function* main() {
  const skip = yield true;
  if (yield !skip) {
    yield console.log('never');
  }
  yield console.log('after');
}
