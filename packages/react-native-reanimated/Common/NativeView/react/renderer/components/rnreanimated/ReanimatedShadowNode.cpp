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

void ReanimatedShadowNode::updateChildProps(const ShadowNode::Shared &child) const {
  auto &bbShadowNode = const_cast<BBShadowNode &>(
      reinterpret_cast<const BBShadowNode &>(*child));
  if (animatedPropsRegistry_){
    auto props =
    animatedPropsRegistry_->get(child->getTag());
    if (props != nullptr){
      auto newProps =
      child->getComponentDescriptor().
      cloneProps(PropsParserContext(child->getSurfaceId(),
                                    *child->getContextContainer()),
                 child->getProps(), RawProps(props));
      bbShadowNode.updateProps(newProps);
    }
  } else {
    LOG(INFO) << "niedobrze";
  }
  
}

void ReanimatedShadowNode::replaceChild(const ShadowNode &oldChild, const ShadowNode::Shared &newChild, size_t suggestedIndex){
  YogaLayoutableShadowNode::replaceChild(oldChild, newChild, suggestedIndex);

  updateChildProps(newChild);
}

void ReanimatedShadowNode::appendChild(const ShadowNode::Shared &child){
  YogaLayoutableShadowNode::appendChild(child);

  updateChildProps(child);
}

} // namespace facebook::react
