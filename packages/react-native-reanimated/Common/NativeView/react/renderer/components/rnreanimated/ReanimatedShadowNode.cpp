#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

void ReanimatedShadowNode::onCreate(
    const double timestamp,
    const ReanimatedNodeProps &props) {
  const auto &state = getStateData();
  state.cssAnimationsManager->onPropsChange(
      timestamp, ReanimatedNodeProps(), props);
}

void ReanimatedShadowNode::onPropsChange(
    const double timestamp,
    const ReanimatedNodeProps &oldProps,
    const ReanimatedNodeProps &newProps) {
  const auto &state = getStateData();
  state.cssAnimationsManager->onPropsChange(timestamp, oldProps, newProps);
  state.cssTransitionManager->onPropsChange(timestamp, oldProps, newProps);
}

folly::dynamic ReanimatedShadowNode::onFrame(const double timestamp) {
  const auto &state = getStateData();
  const auto sharedThis = shared_from_this();
  return state.cssTransitionManager->onFrame(timestamp, sharedThis);
}

} // namespace facebook::react
