let MUTABLE_ID = 0;
let MAPPER_ID = 0;

class MutableValue {
  _animation = null;
  _listeners = [];

  constructor(value, setter) {
    this._id = MUTABLE_ID++;
    this._value = value;
    this._setter = setter;
  }

  get value() {
    return this._value;
  }

  set value(nextValue) {
    this._setter.apply(this, [nextValue]);

    this._triggerListener();
  }

  addListener(listener) {
    this._listeners.push(listener);
  }

  _triggerListener() {
    this._listeners.forEach(listener => {
      listener();
    });
  }
}

class Mapper {
  dirty = false;

  constructor(module, mapper, inputs = [], outputs = []) {
    this.id = MAPPER_ID++;
    this.inputs = inputs;
    this.outputs = outputs;
    this.mapper = mapper;

    const markDirty = () => {
      this.dirty = true;
      module.maybeRequestRender();
    };

    inputs.forEach(input => {
      if (input instanceof MutableValue) {
        input.addListener(markDirty);
      }
    });
  }

  execute() {
    this._dirty = false;

    this.mapper();
  }
}

class MapperRegistry {
  sortedMappers = [];
  mappers = new Map();

  updatedSinceLastExecute = false;

  constructor(module) {
    this._module = module;
  }

  startMapper(mapper) {
    this.mappers.set(mapper.id, mapper);
    this.updatedSinceLastExecute = true;
  }

  stopMapper(id) {
    this.mappers.delete(id);
    this.updatedSinceLastExecute = true;
  }

  execute() {
    if (this.updatedSinceLastExecute) {
      this.updateOrder();
      this.updatedSinceLastExecute = false;
    }

    this.sortedMappers.forEach(mapper => {
      console.log('mappers');
      if (mapper.dirty) {
        console.log('dirty');
        mapper.execute();
      }
    });
  }

  updateOrder() {
    // TODO: Sort it in topological order
    this.sortedMappers = [...this.mappers.values()];
  }
}

class JSReanimated {
  _valueSetter = undefined;
  _renderRequested = false;
  _mapperRegistry = new MapperRegistry(this);
  _frames = [];

  pushFrame(frame) {
    console.log('pushFrame');
    this._frames.push(frame);

    this.maybeRequestRender();
  }

  maybeRequestRender() {
    if (!this._renderRequested) {
      this._renderRequested = true;

      requestAnimationFrame(timestampMs => {
        this._renderRequested = false;

        this._onRender(timestampMs);
      });
    }
  }

  _onRender(timestampMs) {
    console.log('onRender');
    this._mapperRegistry.execute();

    const frames = [...this._frames];
    this._frames = [];

    frames.forEach(callback => {
      console.log('frameCallback');
      callback(timestampMs);
    });

    // this._mapperRegistry.execute();
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
    return JSON.parse(JSON.stringify(object));
  }

  startMapper(mapper, inputs = [], outputs = []) {
    const instance = new Mapper(this, mapper, inputs, outputs);

    this._mapperRegistry.startMapper(instance);
  }

  stopMapper(mapperId) {
    this._mapperRegistry.stopMapper(mapperId);
  }

  registerEventHandler(eventHash, eventHandler) {}

  unregisterEventHandler(registrationId) {}
}

const reanimatedJS = new JSReanimated();

global._updatePropsJS = (viewTag, updates, viewRef) => {
  console.log('updateProps');

  const [rawStyles, animations] = Object.keys(updates).reduce(
    (acc, key) => {
      const value = updates[key];

      const index = typeof value === 'function' ? 1 : 0;

      acc[index][key] = value;

      return acc;
    },
    [{}, {}]
  );

  viewRef.current._setAnimatedStyle(rawStyles);

  // TODO: Handle animations in styles
  // Object.keys(animations).forEach(key => {
  //   const animationCreator = animations[key];

  //   console.log(animationCreator.toString());

  // });

  reanimatedJS.maybeRequestRender();
};

global.requestAnimationFrame_Reanimated = callback => {
  reanimatedJS.pushFrame(callback);
};

export default reanimatedJS;
