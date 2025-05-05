#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNodeFragment &fragment,
    const ShadowNodeFamily::Shared &family,
    ShadowNodeTraits traits)
    : ReanimatedViewShadowNodeBase(fragment, family, traits) {
  const auto &newProps =
      static_cast<const ReanimatedViewProps &>(*this->getProps());
  const auto &state = getStateData();
  state.cssAnimationsManager->update(folly::dynamic::object(), newProps);
}

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment)
    : ReanimatedViewShadowNodeBase(sourceShadowNode, fragment) {
  const auto &oldProps =
      static_cast<const ReanimatedViewProps &>(*sourceShadowNode.getProps());
  const auto &newProps =
      static_cast<const ReanimatedViewProps &>(*this->getProps());

  // Check if props object is the same first - it will be the same e.g. if
  // commit to the ShadowTree was made from reanimated and props on the JS side
  // didn't change
  if (&oldProps == &newProps) {
    return;
  }

  const auto &state = getStateData();
  state.cssTransitionManager->update(oldProps, newProps);
  state.cssAnimationsManager->update(oldProps, newProps);
}

void ReanimatedShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

} // namespace facebook::react
