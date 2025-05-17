#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNodeFragment &fragment,
    const ShadowNodeFamily::Shared &family,
    ShadowNodeTraits traits)
    : ReanimatedViewShadowNodeBase(fragment, family, traits) {
  const auto &newProps =
      static_cast<const ReanimatedNodeProps &>(*this->getProps());

  const auto &state = getStateData();
  state.cssAnimationsManager->update(newProps);
}

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment)
    : ReanimatedViewShadowNodeBase(sourceShadowNode, fragment) {
  const auto &oldProps =
      static_cast<const ReanimatedNodeProps &>(*sourceShadowNode.getProps());
  const auto &newProps =
      static_cast<const ReanimatedNodeProps &>(*this->getProps());

  const auto &state = getStateData();
  state.cssAnimationsManager->update(newProps);
  state.cssTransitionManager->update(oldProps, newProps);
}

void ReanimatedShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

} // namespace facebook::react
