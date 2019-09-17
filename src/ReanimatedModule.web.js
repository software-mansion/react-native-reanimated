export default {
  async attachEvent(viewTag, eventName, nodeID) {
    console.warn('Reanimated: attachEvent is unimplemented on web');
  },
  async detachEvent(viewTag, eventName, nodeID) {
    console.warn('Reanimated: detachEvent is unimplemented on web');
  },
  async disconnectNodeFromView(nodeID, nativeViewTag) {
    console.warn('Reanimated: disconnectNodeFromView is unimplemented on web');
  },
  async createNode(nodeID, config) {
    // noop
  },
  async dropNode(nodeID) {
    // noop
  },
  async configureProps() {
    // noop
  },
  async disconnectNodes() {
    // noop
  },
};
