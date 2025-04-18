#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

class ReanimatedViewComponentDescriptor
    : public ConcreteComponentDescriptor<ReanimatedShadowNode> {
 public:
  explicit ReanimatedViewComponentDescriptor(
      const ComponentDescriptorParameters &parameters)
      : ConcreteComponentDescriptor<ReanimatedShadowNode>(parameters) {
   ;
  }

     void adopt(ShadowNode &shadowNode) const override {
//       const auto &reanimatedShadowNode =
//           static_cast<ReanimatedShadowNode &>(shadowNode);
//       reanimatedShadowNode.initialize(reanimatedModuleProxy_);
         
         LOG(INFO) << "Has? "
                   << getContextContainer()
                          ->find<std::shared_ptr<ReanimatedModuleProxy>>(
                              "ReanimatedModuleProxy")
                          .has_value();
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
