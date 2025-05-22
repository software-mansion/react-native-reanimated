#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/Fabric/OperationsLoop.h>
#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

#include <memory>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class ReanimatedViewComponentDescriptor
    : public ConcreteComponentDescriptor<ReanimatedShadowNode> {
 public:
  explicit ReanimatedViewComponentDescriptor(
      const ComponentDescriptorParameters &parameters);

  std::shared_ptr<OperationsLoop> getOperationsLoop() const;
  std::shared_ptr<ViewStylesRepository> getViewStylesRepository() const;

  void adopt(ShadowNode &shadowNode) const override;

  State::Shared createInitialState(
      const Props::Shared & /*props*/,
      const ShadowNodeFamily::Shared &family) const override;

 private:
  std::shared_ptr<OperationsLoop> operationsLoop_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;

  void initialize(const std::shared_ptr<ReanimatedModuleProxy> &proxy);
  void dummyInitialize();
};

void rnreanimated_registerComponentDescriptorsFromCodegen(
    const std::shared_ptr<const ComponentDescriptorProviderRegistry> &registry);

} // namespace facebook::react
