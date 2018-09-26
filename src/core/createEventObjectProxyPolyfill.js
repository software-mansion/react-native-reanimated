// TODO remove after update of JSC
// because currently JSC does not support Proxy
export default function createEventObjectProxyPolyfill() {
  const nodesMap = {
    // Gesture handlers-related event
    translationX: {},
    translationY: {},
    state: {},
    oldState: {},
    absoluteX: {},
    absoluteY: {},
    x: {},
    y: {},
    velocityX: {},
    velocityY: {},
    scale: {},
    focalX: {},
    focalY: {},
    rotation: {},
    anchorX: {},
    anchorY: {},
    velocity: {},
    numberOfPointers: {},
    // onLayour-related event
    layout: { x: {}, y: {}, width: {}, height: {} },
    // ScrollView event
    contentOffset: { y: {}, x: {} },
    layoutMeasurement: { width: {}, height: {} },
    contentSize: { width: {}, height: {} },
    zoomScale: {},
    contentInset: { right: {}, top: {}, left: {}, bottom: {} },
  };
  const traverse = obj => {
    for (key in obj) {
      obj[key].__isProxy = true;
      traverse(obj[key]);
    }
  };
  traverse(nodesMap);
  return nodesMap;
}
