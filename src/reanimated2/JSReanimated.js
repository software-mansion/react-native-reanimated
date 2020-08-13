let MUTABLE_ID = 0;
let MAPPER_ID = 0;

function extractMutablesFromArray(array) {
  const res = [];

  function extractMutables(value) {
    if (value instanceof MutableValue) {
      res.push(value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => extractMutables(v));
    } else if (typeof value === 'object') {
      Object.keys(value).forEach((key) => {
        extractMutables(value[key]);
      });
    }
  }

  extractMutables(array);

  return res;
}

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
    // eslint-disable-next-line
    this._setter.apply(this, [nextValue]);

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

class Mapper {
  dirty = true;

  constructor(module, mapper, inputs = [], outputs = []) {
    this.id = MAPPER_ID++;
    this.inputs = extractMutablesFromArray(inputs);
    this.outputs = extractMutablesFromArray(outputs);
    this.mapper = mapper;

    const markDirty = () => {
      this.dirty = true;
      module.maybeRequestRender();
    };

    this.inputs.forEach((input) => {
      input.addListener(markDirty);
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

    this.sortedMappers.forEach((mapper) => {
      if (mapper.dirty) {
        mapper.execute();
      }
    });
  }

  updateOrder() {
    class Node {
      mapper = null;
      children = [];

      constructor(mapper, parents = [], children = []) {
        this.mapper = mapper;
        this.children = children;
      }
    }

    const nodes = [...this.mappers.values()].map((mapper) => new Node(mapper));

    const mappersById = {};
    this.mappers.forEach((mapper) => {
      mappersById[mapper.id] = mapper;
    });

    // create a graph from array of nodes
    nodes.forEach((node) => {
      if (node.mapper.outputs.length === 0) {
        return;
      }
      nodes.forEach((restNode) => {
        if (restNode.mapper.inputs.length === 0) {
          return;
        }
        // do not compare with itself
        if (node.mapper.id !== restNode.mapper.id) {
          node.mapper.outputs.forEach((output) => {
            restNode.mapper.inputs.forEach((restMapperInput) => {
              if (output._id === restMapperInput._id) {
                node.children.push(restNode);
              }
            });
          });
        }
      });
    });

    const post = {};
    let postCounter = 1;
    const dfs = (node) => {
      const index = nodes.indexOf(node);
      if (index === -1) {
        // this node has already been handled
        return;
      }
      ++postCounter;
      nodes.splice(index, 1);
      if (node.children.length === 0 && nodes.length > 0) {
        post[node.mapper.id] = postCounter++;
        dfs(nodes[0]);
        return;
      }
      node.children.forEach((childNode) => {
        dfs(childNode);
      });
      post[node.mapper.id] = postCounter++;
    };

    dfs(nodes[0]);

    const postArray = Object.keys(post).map((key) => {
      return [key, post[key]];
    });
    postArray.sort((a, b) => {
      return b[1] - a[1];
    });
    postArray.forEach(([id, post]) => {
      this.sortedMappers.push(mappersById[id]);
    });

    console.log('sorted mappers:');
    this.sortedMappers.forEach(({ id, inputs, outputs }) => {
      console.log(`${id}/${inputs.length}/${outputs.length}`);
    });
  }

  get needRunOnRender() {
    return this.updatedSinceLastExecute;
  }
}

class JSReanimated {
  native = false;
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

      requestAnimationFrame((timestampMs) => {
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

    frames.forEach((callback) => {
      console.log('frameCallback');
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

const reanimatedJS = new JSReanimated();

global._updatePropsJS = (viewTag, updates, viewRef) => {
  console.log('updateProps');

  const [rawStyles] = Object.keys(updates).reduce(
    (acc, key) => {
      const value = updates[key];

      const index = typeof value === 'function' ? 1 : 0;

      acc[index][key] = value;

      return acc;
    },
    [{}, {}]
  );

  if (viewRef.current._component) {
    viewRef.current._component.setNativeProps({ style: rawStyles });
  }

  // TODO: Handle animations in styles
  // Object.keys(animations).forEach(key => {
  //   const animationCreator = animations[key];

  //   console.log(animationCreator.toString());

  // });

  // reanimatedJS.maybeRequestRender();
};

export default reanimatedJS;
