#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

#include <memory>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class ReanimatedViewComponentDescriptor
    : public ConcreteComponentDescriptor<ReanimatedShadowNode> {
 public:
  explicit ReanimatedViewComponentDescriptor(
      const ComponentDescriptorParameters &parameters)
      : ConcreteComponentDescriptor<ReanimatedShadowNode>(parameters),
        reanimatedModuleProxy_(findReanimatedModuleProxy(parameters)) {}

  void adopt(ShadowNode &shadowNode) const override {
    if (!reanimatedModuleProxy_.has_value()) {
      return;
    }
    const auto &weakPtr = reanimatedModuleProxy_.value();
    if (weakPtr.expired()) {
      return;
    }

    const auto proxy = weakPtr.lock();

    // LOG(INFO) << "We can access the proxy: " << proxy->getCssTimestamp();
  }

 private:
  std::optional<std::weak_ptr<ReanimatedModuleProxy>> reanimatedModuleProxy_;

  std::optional<std::weak_ptr<ReanimatedModuleProxy>> findReanimatedModuleProxy(
      const ComponentDescriptorParameters &parameters) {
    return parameters.contextContainer
        ->find<std::weak_ptr<ReanimatedModuleProxy>>("ReanimatedModuleProxy");
  }
};

void rnreanimated_registerComponentDescriptorsFromCodegen(
    const std::shared_ptr<const ComponentDescriptorProviderRegistry> &registry);

} // namespace facebook::react
