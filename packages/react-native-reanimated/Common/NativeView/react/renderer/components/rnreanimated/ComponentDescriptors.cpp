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
      initialize(proxy);
      return;
    }
  }

  dummyInitialize();
}

std::shared_ptr<OperationsLoop>
ReanimatedViewComponentDescriptor::getOperationsLoop() const {
  return operationsLoop_;
}

std::shared_ptr<ViewStylesRepository>
ReanimatedViewComponentDescriptor::getViewStylesRepository() const {
  return viewStylesRepository_;
}

void ReanimatedViewComponentDescriptor::adopt(ShadowNode &shadowNode) const {}

State::Shared ReanimatedViewComponentDescriptor::createInitialState(
    const Props::Shared & /*props*/,
    const ShadowNodeFamily::Shared &family) const {
  auto state = std::make_shared<ReanimatedViewStateData>();
  state->initialize(operationsLoop_, viewStylesRepository_);
  return std::make_shared<ConcreteState>(state, family);
}

void ReanimatedViewComponentDescriptor::initialize(
    const std::shared_ptr<ReanimatedModuleProxy> &proxy) {
  operationsLoop_ = proxy->getOperationsLoop();
  viewStylesRepository_ = proxy->getViewStylesRepository();
}

void ReanimatedViewComponentDescriptor::dummyInitialize() {
  // TODO - think of a better way to handle this case when we don't have a proxy
  operationsLoop_ = std::make_shared<OperationsLoop>([]() { return 0; });
  viewStylesRepository_ = std::make_shared<ViewStylesRepository>(
      std::make_shared<StaticPropsRegistry>(),
      std::make_shared<AnimatedPropsRegistry>());
}

} // namespace facebook::react
