const mutable = dupa({
  get value() {
    return runOnUI(() => mutable.value)();
  },
  set value(newValue) {
    runOnUI(() => {
      mutable._value = newValue;
    })();
  },
  bob: () => {
    'worklet';
    return mutable.value + 1;
  },
});

// console.log(mutable.bob());

function runOnUI(worklet) {
  return worklet;
}

function dupa(mut) {
  // mut.bob
  // console.log(mut.bob());
}
