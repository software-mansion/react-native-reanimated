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

  void onCreate(double timestamp, const ReanimatedNodeProps &props);
  void onPropsChange(
      double timestamp,
      const ReanimatedNodeProps &oldProps,
      const ReanimatedNodeProps &newProps);
  folly::dynamic getFrameProps(double timestamp);
};

} // namespace facebook::react
