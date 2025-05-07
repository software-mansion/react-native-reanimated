#include <react/renderer/components/rnreanimated/ComponentDescriptors.h>

namespace facebook::react {

ReanimatedViewComponentDescriptor::ReanimatedViewComponentDescriptor(
    const ComponentDescriptorParameters &parameters)
    : ConcreteComponentDescriptor<ReanimatedShadowNode>(parameters) {
  const auto &reanimatedModuleProxy =
      parameters.contextContainer->find<std::weak_ptr<ReanimatedModuleProxy>>(
          "ReanimatedModuleProxy");

  if (reanimatedModuleProxy.has_value()) {
    const auto &proxy = reanimatedModuleProxy.value().lock();
    if (proxy) {
      proxy_ = proxy;
    }
  }
}

void ReanimatedViewComponentDescriptor::adopt(ShadowNode &shadowNode) const {}

State::Shared ReanimatedViewComponentDescriptor::createInitialState(
    const Props::Shared & /*props*/,
    const ShadowNodeFamily::Shared &family) const {
  auto state = std::make_shared<ReanimatedViewStateData>();
  state->initialize(proxy_);
  return std::make_shared<ConcreteState>(state, family);
}

} // namespace facebook::react
