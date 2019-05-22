export default {
  async animateNextTransition(viewTag, config) {
    console.warn('Reanimated: animateNextTransition is unimplemented on web');
  },
  async configureProps(...props) {
    console.warn('Reanimated: configureProps is unimplemented on web');
  },
  async attachEvent(viewTag, eventName, nodeID) {
    console.warn('Reanimated: attachEvent is unimplemented on web');
  },
  async detachEvent(viewTag, eventName, nodeID) {
    console.warn('Reanimated: detachEvent is unimplemented on web');
  },
  async createNode(nodeID, config) {
    console.warn('Reanimated: createNode is unimplemented on web');
  },
  async dropNode(nodeID) {
    console.warn('Reanimated: dropNode is unimplemented on web');
  },
  async connectNodes(nodeID, childNodeID) {
    console.warn('Reanimated: connectNodes is unimplemented on web');
  },
  async disconnectNodes(nodeID, childNodeID) {
    console.warn('Reanimated: disconnectNodes is unimplemented on web');
  },
  async connectNodeToView(nodeID, nativeViewTag) {
    console.warn('Reanimated: connectNodeToView is unimplemented on web');
  },
  async disconnectNodeFromView(nodeID, nativeViewTag) {
    console.warn('Reanimated: disconnectNodeFromView is unimplemented on web');
  },
  async getValue(nodeID, valueCallback) {
    console.warn('Reanimated: getValue is unimplemented on web');
  },
};
