#pragma once

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/Fabric/operations/OperationsLoop.h>
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

  std::shared_ptr<ShadowNode> createShadowNode(
      const ShadowNodeFragment &fragment,
      const ShadowNodeFamily::Shared &family) const override;

  ShadowNode::Unshared cloneShadowNode(
      const ShadowNode &sourceShadowNode,
      const ShadowNodeFragment &fragment) const override;

  State::Shared createInitialState(
      const Props::Shared & /*props*/,
      const ShadowNodeFamily::Shared &family) const override;

 private:
  void maybeApplyFrame(
      double timestamp,
      const std::shared_ptr<ReanimatedShadowNode> &shadowNode) const;
  ShadowNode::Shared cloneWithMergedProps(
      const ShadowNode &shadowNode,
      const folly::dynamic &props) const;
  std::shared_ptr<ReanimatedModuleProxy> getProxy() const;
};

void rnreanimated_registerComponentDescriptorsFromCodegen(
    const std::shared_ptr<const ComponentDescriptorProviderRegistry> &registry);

} // namespace facebook::react
