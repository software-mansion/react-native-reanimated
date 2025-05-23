#pragma once

#include <react/renderer/components/rnreanimated/EventEmitters.h>
#include <react/renderer/components/rnreanimated/ReanimatedNodeProps.h>
#include <react/renderer/components/rnreanimated/ReanimatedViewStateData.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

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
  using ReanimatedViewShadowNodeBase::ReanimatedViewShadowNodeBase;

  void onCreate(const ReanimatedNodeProps &props);
  void onDestroy();

  void onPropsChange(
      const ReanimatedNodeProps &oldProps,
      const ReanimatedNodeProps &newProps);
};

} // namespace facebook::react
