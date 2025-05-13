#include <react/renderer/components/rnreanimated/ComponentDescriptors.h>

namespace facebook::react {

ReanimatedViewComponentDescriptor::ReanimatedViewComponentDescriptor(
    const ComponentDescriptorParameters &parameters)
    : ConcreteComponentDescriptor<ReanimatedShadowNode>(parameters) {}

void ReanimatedViewComponentDescriptor::adopt(ShadowNode &shadowNode) const {}

State::Shared ReanimatedViewComponentDescriptor::createInitialState(
    const Props::Shared & /*props*/,
    const ShadowNodeFamily::Shared &family) const {
  return std::make_shared<const ConcreteState>(
      std::make_shared<ReanimatedViewStateData>(getProxy()), family);
}

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

} // namespace facebook::react
