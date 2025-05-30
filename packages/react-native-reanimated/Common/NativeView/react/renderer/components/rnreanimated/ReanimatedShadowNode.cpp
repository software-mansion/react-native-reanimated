#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

void ReanimatedShadowNode::onCreate(
    const double timestamp,
    const ReanimatedNodeProps &props) {
  const auto &state = getStateData();
  state.cssAnimationsManager->update(ReanimatedNodeProps(), props);
}

void ReanimatedShadowNode::onPropsChange(
    const double timestamp,
    const ReanimatedNodeProps &oldProps,
    const ReanimatedNodeProps &newProps) {
  const auto &state = getStateData();
  state.cssAnimationsManager->update(oldProps, newProps);
  state.cssTransitionManager->onPropsChange(timestamp, oldProps, newProps);
}

folly::dynamic ReanimatedShadowNode::getFrameProps(const double timestamp) {
  return folly::dynamic::object();
}

} // namespace facebook::react
