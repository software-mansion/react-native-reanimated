let nodesCreated = 0;
export default {
  configureNativeProps: () => {},
  createNode: () => nodesCreated++,
  connectNodes: () => {},
  disconnectNodes: () => {},
  dropNode: () => nodesCreated--,
  getNumberOfNodes: () => nodesCreated,
};
