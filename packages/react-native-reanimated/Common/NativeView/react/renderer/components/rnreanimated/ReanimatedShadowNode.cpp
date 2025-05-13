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
  state.cssAnimationsManager->update(newProps);
}

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment)
    : ReanimatedViewShadowNodeBase(sourceShadowNode, fragment) {
  const auto &oldProps =
      static_cast<const ReanimatedViewProps &>(*sourceShadowNode.getProps());
  const auto &newProps =
      static_cast<const ReanimatedViewProps &>(*this->getProps());

  // TODO - optimize cloning (don't call update if props on the JS side didn't
  // change)

  const auto &state = getStateData();
  state.cssTransitionManager->update(oldProps, newProps);
  state.cssAnimationsManager->update(newProps);
}

void ReanimatedShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

} // namespace facebook::react
