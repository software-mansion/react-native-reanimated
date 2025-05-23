#pragma once

#include <react/renderer/components/rnreanimated/EventEmitters.h>
#include <react/renderer/components/rnreanimated/ReanimatedNodeProps.h>
#include <react/renderer/components/rnreanimated/ReanimatedViewStateData.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutContext.h>

namespace facebook::react {

JSI_EXPORT extern const char ReanimatedViewComponentName[];

using ReanimatedViewShadowNodeBase = ConcreteViewShadowNode<
    ReanimatedViewComponentName,
    ReanimatedNodeProps,
    ReanimatedViewEventEmitter,
    ReanimatedViewStateData>;

class ReanimatedShadowNode final
    : public ReanimatedViewShadowNodeBase,
      public std::enable_shared_from_this<ReanimatedShadowNode> {
 public:
  ReanimatedShadowNode(
      const ShadowNodeFragment &fragment,
      const ShadowNodeFamily::Shared &family,
      ShadowNodeTraits traits);

  ReanimatedShadowNode(
      const ShadowNode &sourceShadowNode,
      const ShadowNodeFragment &fragment);

 private:
  void onMount(const ReanimatedNodeProps &props);
  void onUnmount();

  void onPropsChange(
      const ReanimatedNodeProps &oldProps,
      const ReanimatedNodeProps &newProps);
};

} // namespace facebook::react
