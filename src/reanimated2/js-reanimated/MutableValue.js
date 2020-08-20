export default class MutableValue {
  static MUTABLE_ID = 1;

  _animation = null;
  _listeners = [];

  constructor(value, setter) {
    this._id = MutableValue.MUTABLE_ID++;
    this._value = value;
    this._setter = setter;
  }

  get value() {
    return this._value;
  }

  set value(nextValue) {
    // eslint-disable-next-line
    this._setter.apply(this, [nextValue]);

    this._triggerListener();
  }

  _setValue(newValue) {
    this._value = newValue;
    this._triggerListener();
  }

  addListener(listener) {
    console.log('add listener');
    this._listeners.push(listener);
  }

  _triggerListener() {
    console.log('Trigger listeners', this._listeners);
    this._listeners.forEach((listener) => {
      listener();
    });
  }
}
