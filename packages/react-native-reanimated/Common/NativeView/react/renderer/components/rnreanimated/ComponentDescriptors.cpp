#include <react/renderer/components/rnreanimated/ComponentDescriptors.h>

namespace facebook::react {

ReanimatedViewComponentDescriptor::ReanimatedViewComponentDescriptor(
    const ComponentDescriptorParameters &parameters)
    : ConcreteComponentDescriptor<ReanimatedShadowNode>(parameters) {
  const auto &reanimatedModuleProxy =
      parameters.contextContainer->find<std::weak_ptr<ReanimatedModuleProxy>>(
          "ReanimatedModuleProxy");

  if (!reanimatedModuleProxy.has_value()) {
    return;
  }
  const auto &proxy = reanimatedModuleProxy.value().lock();
  if (!proxy) {
    return;
  }

  proxy_ = proxy;
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
      createShadowNodeFragment(fragment), family);
}

ShadowNode::Unshared ReanimatedViewComponentDescriptor::cloneShadowNode(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment) const {
  return ConcreteComponentDescriptor::cloneShadowNode(
      sourceShadowNode, createShadowNodeFragment(fragment));
}

State::Shared ReanimatedViewComponentDescriptor::createInitialState(
    const Props::Shared & /*props*/,
    const ShadowNodeFamily::Shared &family) const {
  auto state = std::make_shared<ReanimatedViewStateData>();
  state->initialize(proxy_);
  return std::make_shared<ConcreteState>(state, family);
}

ShadowNodeFragment ReanimatedViewComponentDescriptor::createShadowNodeFragment(
    const ShadowNodeFragment &fragment) const {
  return ShadowNodeFragment{
      .props = reanimatedNodeProps_,
      .children = fragment.children,
      .state = fragment.state,
      .runtimeShadowNodeReference = fragment.runtimeShadowNodeReference,
  };
}

} // namespace facebook::react
