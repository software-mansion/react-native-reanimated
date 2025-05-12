#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNodeFragment &fragment,
    const ShadowNodeFamily::Shared &family,
    ShadowNodeTraits traits)
    : ReanimatedViewShadowNodeBase(fragment, family, traits) {
  // TODO - fix state updates later
  //  const auto &stateData = getStateData();
  //  if (!stateData.isInitialized()) {
  //    return;
  //  }
  //
  //  const auto &newProps =
  //      static_cast<const ReanimatedViewProps &>(*this->getProps());
  //  stateData.cssAnimationsManager->update(newProps);
}

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment)
    : ReanimatedViewShadowNodeBase(sourceShadowNode, fragment) {
  // TODO - fix state updates later
  //  const auto &stateData = getStateData();
  //  if (!stateData.isInitialized()) {
  //    return;
  //  }
  //
  //  const auto &oldProps =
  //      static_cast<const ReanimatedViewProps
  //      &>(*sourceShadowNode.getProps());
  //  const auto &newProps =
  //      static_cast<const ReanimatedViewProps &>(*this->getProps());
  //
  //  // Check if props object is the same first - it will be the same e.g. if
  //  // commit to the ShadowTree was made from reanimated and props on the JS
  //  side
  //  // didn't change
  //  if (&oldProps == &newProps) {
  //    return;
  //  }
  //
  //  stateData.cssTransitionManager->update(oldProps, newProps);
  //  stateData.cssAnimationsManager->update(newProps);
}

void ReanimatedShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

} // namespace facebook::react
