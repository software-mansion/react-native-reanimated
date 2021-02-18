export default {
  async disconnectNodeFromView() {
    // noop
  },
  async attachEvent(_viewTag, _eventName, _nodeID) {
    // noop
  },
  async detachEvent(_viewTag, _eventName, _nodeID) {
    // noop
  },
  async createNode(_nodeID, _config) {
    // noop
  },
  async dropNode(_nodeID) {
    // noop
  },
  async configureProps() {
    // noop
  },
  async disconnectNodes() {
    // noop
  },
  async animateNextTransition() {
    console.warn(
      'Reanimated: animateNextTransition is unimplemented on current platform'
    );
  },
};
