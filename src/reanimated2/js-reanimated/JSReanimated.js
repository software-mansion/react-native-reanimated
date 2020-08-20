import MapperRegistry from './MapperRegistry';
import MutableValue from './MutableValue';
import Mapper from './Mapper';

export default class JSReanimated {
  native = false;
  _valueSetter = undefined;
  _renderRequested = false;
  _mapperRegistry = new MapperRegistry(this);
  _frames = [];

  pushFrame(frame) {
    this._frames.push(frame);

    this.maybeRequestRender();
  }

  maybeRequestRender() {
    if (!this._renderRequested) {
      this._renderRequested = true;

      requestAnimationFrame((timestampMs) => {
        this._renderRequested = false;

        this._onRender(timestampMs);
      });
    }
  }

  _onRender(timestampMs) {
    this._mapperRegistry.execute();

    const frames = [...this._frames];
    this._frames = [];

    frames.forEach((callback) => {
      callback(timestampMs);
    });

    if (this._mapperRegistry.needRunOnRender) {
      this._mapperRegistry.execute();
    }
  }

  installCoreFunctions(valueSetter) {
    this._valueSetter = valueSetter;
  }

  makeShareable(value) {
    return value;
  }

  makeMutable(value) {
    return new MutableValue(value, this._valueSetter);
  }

  makeRemote(object) {
    return object;
  }

  startMapper(mapper, inputs = [], outputs = []) {
    const instance = new Mapper(this, mapper, inputs, outputs);

    this._mapperRegistry.startMapper(instance);

    this.maybeRequestRender();
  }

  stopMapper(mapperId) {
    this._mapperRegistry.stopMapper(mapperId);
  }

  registerEventHandler(eventHash, eventHandler) {}

  unregisterEventHandler(registrationId) {}
}
