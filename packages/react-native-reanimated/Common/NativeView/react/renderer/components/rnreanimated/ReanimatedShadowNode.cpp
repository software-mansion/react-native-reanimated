#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNodeFragment &fragment,
    const ShadowNodeFamily::Shared &family,
    ShadowNodeTraits traits)
    : ReanimatedViewShadowNodeBase(fragment, family, traits) {
  initialize();
}

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment)
    : ReanimatedViewShadowNodeBase(sourceShadowNode, fragment) {
  initialize();
}

void ReanimatedShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

void ReanimatedShadowNode::initialize() {
  auto &props = BaseShadowNode::getConcreteProps();
  if (!props.cssTransition.empty()) {
    LOG(INFO) << "CSS Transition: " << props.cssTransition;
  }
}

} // namespace facebook::react
