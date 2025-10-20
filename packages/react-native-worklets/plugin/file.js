function callback(arg) {
  'worklet';

  console.log(`Callback called with arg: ${arg}`);

  if (arg > 1) {
    return;
  }

  runOnUI(() => callback(arg + 1))();
}

callback(0);
