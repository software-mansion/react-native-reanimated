#include <react/renderer/components/rnreanimated/ComponentDescriptors.h>

namespace facebook::react {

ReanimatedViewComponentDescriptor::ReanimatedViewComponentDescriptor(
    const ComponentDescriptorParameters &parameters)
    : ConcreteComponentDescriptor<ReanimatedShadowNode>(parameters),
      reanimatedModuleProxy_(findReanimatedModuleProxy(parameters)) {}

void ReanimatedViewComponentDescriptor::adopt(ShadowNode &shadowNode) const {
  withProxy([](const std::shared_ptr<ReanimatedModuleProxy> &proxy) {
    //  LOG(INFO) << "We can access the proxy: " << proxy->getCssTimestamp();
  });
}

State::Shared ReanimatedViewComponentDescriptor::createInitialState(
    const Props::Shared &props,
    const ShadowNodeFamily::Shared &family) const {
  return nullptr;
}

std::optional<std::weak_ptr<ReanimatedModuleProxy>>
ReanimatedViewComponentDescriptor::findReanimatedModuleProxy(
    const ComponentDescriptorParameters &parameters) {
  return parameters.contextContainer
      ->find<std::weak_ptr<ReanimatedModuleProxy>>("ReanimatedModuleProxy");
}

} // namespace facebook::react
