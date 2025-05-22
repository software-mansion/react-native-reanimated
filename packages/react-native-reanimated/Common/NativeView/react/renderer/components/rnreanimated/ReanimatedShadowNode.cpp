#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

ReanimatedShadowNode::ReanimatedShadowNode(
    const ShadowNodeFragment &fragment,
    const ShadowNodeFamily::Shared &family,
    ShadowNodeTraits traits)
    : ReanimatedViewShadowNodeBase(fragment, family, traits) {
  // TODO - create CSSManager in state with initial CSS properties
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
  if (&oldProps != &newProps) {
    // If props objects are different (that means, some of JS props were
    // updated), we need to check if CSS transition config was updated. We
    // perform a deep comparison of the who folly::dynamic objects by value.
    if (oldProps.cssTransition != newProps.cssTransition) {
      // LOG(INFO) << "CSS transition config updated:\nold: "
      //           << oldProps.cssTransition << " new: " <<
      //           newProps.cssTransition;
    }
    if (oldProps.jsStyle != newProps.jsStyle) {
      // LOG(INFO) << "JS style updated:\nold: " << oldProps.jsStyle
      //           << " new: " << newProps.jsStyle;
    }
  }

  // TODO - update CSSManager only when transition/animation props have
  // changed
}

void ReanimatedShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

} // namespace facebook::react
