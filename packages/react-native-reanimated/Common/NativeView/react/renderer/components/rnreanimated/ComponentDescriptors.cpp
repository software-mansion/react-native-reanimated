#include <react/renderer/components/rnreanimated/ComponentDescriptors.h>

namespace facebook::react {

ReanimatedViewComponentDescriptor::ReanimatedViewComponentDescriptor(
    const ComponentDescriptorParameters &parameters)
    : ConcreteComponentDescriptor<ReanimatedShadowNode>(parameters) {
  reanimatedNodeProps_ = cloneProps(
      // cloneProps needs PropsParserContext to be passed. It can be anything
      // here as it is not used while parsing the display: contents prop, so we
      // use the mandatory 0 value for the surfaceId
      PropsParserContext(0, *parameters.contextContainer),
      ShadowNodeFragment::propsPlaceholder(),
      RawProps(folly::dynamic::object("display", "contents")));
}

std::shared_ptr<ShadowNode> ReanimatedViewComponentDescriptor::createShadowNode(
    const ShadowNodeFragment &fragment,
    const ShadowNodeFamily::Shared &family) const {
  return ConcreteComponentDescriptor::createShadowNode(
      createReanimatedNodeFragment(fragment, *family), family);
}

ShadowNode::Unshared ReanimatedViewComponentDescriptor::cloneShadowNode(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment) const {
  return ConcreteComponentDescriptor::cloneShadowNode(
      sourceShadowNode,
      createReanimatedNodeFragment(fragment, sourceShadowNode.getFamily()));
}

State::Shared ReanimatedViewComponentDescriptor::createInitialState(
    const Props::Shared &props,
    const ShadowNodeFamily::Shared &family) const {
  return std::make_shared<const ConcreteState>(
      std::make_shared<ReanimatedViewStateData>(getProxy()), family);
}

void ReanimatedViewComponentDescriptor::adopt(ShadowNode &shadowNode) const {}

std::shared_ptr<ReanimatedModuleProxy>
ReanimatedViewComponentDescriptor::getProxy() const {
  // Sometimes ReanimatedModuleProxy is initialized before
  // ReanimatedViewComponentDescriptor and sometimes after it. Because of that,
  // we cannot get the proxy instance in the constructor and need to use this
  // getter function. Each of ReanimatedViewComponentDescriptor methods is
  // called after ReanimatedModuleProxy is already added to the context
  // container, so we can safely call this getter function anywhere in the
  // component descriptor except for the constructor.
  return contextContainer_
      ->at<std::weak_ptr<ReanimatedModuleProxy>>("ReanimatedModuleProxy")
      .lock();
}

ShadowNodeFragment
ReanimatedViewComponentDescriptor::createReanimatedNodeFragment(
    const ShadowNodeFragment &fragment,
    const ShadowNodeFamily &family) const {
  return ShadowNodeFragment{
      .props = reanimatedNodeProps_,
      .children = fragment.children,
      .state = fragment.state,
      .runtimeShadowNodeReference = fragment.runtimeShadowNodeReference,
  };
}

} // namespace facebook::react
