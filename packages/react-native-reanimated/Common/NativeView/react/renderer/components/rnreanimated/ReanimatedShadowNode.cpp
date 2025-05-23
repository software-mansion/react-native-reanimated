#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

void ReanimatedShadowNode::onCreate(const ReanimatedNodeProps &props) {
  const auto &state = getStateData();
  state.cssAnimationsManager->update(ReanimatedNodeProps(), props);
}

void ReanimatedShadowNode::onDestroy() {}

void ReanimatedShadowNode::onPropsChange(
    const ReanimatedNodeProps &oldProps,
    const ReanimatedNodeProps &newProps) {
  const auto &state = getStateData();
  state.cssAnimationsManager->update(oldProps, newProps);
  state.cssTransitionManager->update(oldProps, newProps);
}

} // namespace facebook::react
