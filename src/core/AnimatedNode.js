import ReanimatedModule from '../ReanimatedModule';

const UPDATED_NODES = [];

let loopID = 1;
let propUpdatesEnqueued = null;

function sanitizeConfig(config) {
  for (const key in config) {
    const value = config[key];
    if (value instanceof AnimatedNode) {
      config[key] = value.__nodeID;
    }
  }
  return config;
}

function runPropUpdates() {
  const visitedNodes = new Set();
  const findAndUpdateNodes = node => {
    if (visitedNodes.has(node)) {
      return;
    } else {
      visitedNodes.add(node);
    }
    if (typeof node.update === 'function') {
      node.update();
    } else {
      const nodes = node.__getChildren();

      if (nodes) {
        for (let i = 0, l = nodes.length; i < l; i++) {
          findAndUpdateNodes(nodes[i]);
        }
      }
    }
  };
  for (let i = 0; i < UPDATED_NODES.length; i++) {
    const node = UPDATED_NODES[i];
    findAndUpdateNodes(node);
  }
  UPDATED_NODES.length = 0; // clear array
  propUpdatesEnqueued = null;
  loopID += 1;
}

let nodeCount = 0;

export default class AnimatedNode {
  constructor(nodeConfig, inputNodes) {
    this.__nodeID = ++nodeCount;
    this.__nodeConfig = sanitizeConfig(nodeConfig);
    this.__initialized = false;
    this.__inputNodes =
      inputNodes && inputNodes.filter(node => node instanceof AnimatedNode);
  }

  __attach() {
    this.__nativeInitialize();

    const nodes = this.__inputNodes;

    if (nodes) {
      for (let i = 0, l = nodes.length; i < l; i++) {
        nodes[i].__addChild(this);
      }
    }
  }

  __detach() {
    const nodes = this.__inputNodes;

    if (nodes) {
      for (let i = 0, l = nodes.length; i < l; i++) {
        nodes[i].__removeChild(this);
      }
    }

    this.__nativeTearDown();
  }

  __lastLoopID = 0;
  __memoizedValue = null;

  __children = [];

  __getValue() {
    if (this.__lastLoopID < loopID) {
      this.__lastLoopID = loopID;
      return (this.__memoizedValue = this.__onEvaluate());
    }
    return this.__memoizedValue;
  }

  __forceUpdateCache(newValue) {
    this.__memoizedValue = newValue;
    this.__markUpdated();
  }

  __dangerouslyRescheduleEvaluate() {
    this.__lastLoopID = 0;
    this.__markUpdated();
  }

  __markUpdated() {
    UPDATED_NODES.push(this);
    if (!propUpdatesEnqueued) {
      propUpdatesEnqueued = setImmediate(runPropUpdates);
    }
  }

  __nativeInitialize() {
    if (!this.__initialized) {
      ReanimatedModule.createNode(this.__nodeID, { ...this.__nodeConfig });
      this.__initialized = true;
    }
  }

  __nativeTearDown() {
    if (this.__initialized) {
      ReanimatedModule.dropNode(this.__nodeID);
      this.__initialized = false;
    }
  }

  isNativelyInitialized() {
    return this.__initialized;
  }

  __onEvaluate() {
    throw new Error('Missing implementation of onEvaluate');
  }

  __getProps() {
    return this.__getValue();
  }

  __getChildren() {
    return this.__children;
  }

  __addChild(child) {
    if (this.__children.length === 0) {
      this.__attach();
    }
    this.__children.push(child);
    child.__nativeInitialize();

    ReanimatedModule.connectNodes(this.__nodeID, child.__nodeID);
  }

  __removeChild(child) {
    const index = this.__children.indexOf(child);
    if (index === -1) {
      console.warn("Trying to remove a child that doesn't exist");
      return;
    }
    ReanimatedModule.disconnectNodes(this.__nodeID, child.__nodeID);

    this.__children.splice(index, 1);
    if (this.__children.length === 0) {
      this.__detach();
    }
  }

  _connectAnimatedView(nativeViewTag) {
    ReanimatedModule.connectNodeToView(this.__nodeID, nativeViewTag);
  }

  _disconnectAnimatedView(nativeViewTag) {
    ReanimatedModule.disconnectNodeFromView(this.__nodeID, nativeViewTag);
  }
}
