#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNodeFragment &fragment,
    const ShadowNodeFamily::Shared &family,
    ShadowNodeTraits traits)
    : ReanimatedViewShadowNodeBase(fragment, family, traits) {
  const auto &props =
      static_cast<const ReanimatedNodeProps &>(*this->getProps());
  onMount(props);
}

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment)
    : ReanimatedViewShadowNodeBase(sourceShadowNode, fragment) {
  const auto &oldProps =
      static_cast<const ReanimatedNodeProps &>(*sourceShadowNode.getProps());
  const auto &newProps =
      static_cast<const ReanimatedNodeProps &>(*this->getProps());

  if (&oldProps != &newProps) {
    onPropsChange(oldProps, newProps);
  }
}

void ReanimatedShadowNode::onMount(const ReanimatedNodeProps &props) {
  const auto &state = getStateData();
  state.cssAnimationsManager->update(ReanimatedNodeProps(), props);
}

void ReanimatedShadowNode::onUnmount() {}

void ReanimatedShadowNode::onPropsChange(
    const ReanimatedNodeProps &oldProps,
    const ReanimatedNodeProps &newProps) {
  const auto &state = getStateData();
  state.cssAnimationsManager->update(oldProps, newProps);
  state.cssTransitionManager->update(oldProps, newProps);
}

} // namespace facebook::react
