#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

namespace facebook::react {

using namespace reanimated;

class ReanimatedViewComponentDescriptor
    : public ConcreteComponentDescriptor<ReanimatedShadowNode> {
 public:
  explicit ReanimatedViewComponentDescriptor(
      const ComponentDescriptorParameters &parameters)
      : ConcreteComponentDescriptor<ReanimatedShadowNode>(parameters),
        reanimatedModuleProxy_(
            getReanimatedModuleProxy(parameters.contextContainer)) {}

  void adopt(ShadowNode &shadowNode) const override {
    // We can access the reanimatedModuleProxy_ here
    LOG(INFO) << "ReanimatedModuleProxy: " << !!reanimatedModuleProxy_;
  }

 private:
  std::shared_ptr<ReanimatedModuleProxy> reanimatedModuleProxy_;

  static std::shared_ptr<ReanimatedModuleProxy> getReanimatedModuleProxy(
      const std::shared_ptr<const ContextContainer> &contextContainer) {
    return contextContainer->at<std::shared_ptr<ReanimatedModuleProxy>>(
        "ReanimatedModuleProxy");
  }
};

void rnreanimated_registerComponentDescriptorsFromCodegen(
    const std::shared_ptr<const ComponentDescriptorProviderRegistry> &registry);

} // namespace facebook::react
