#pragma once

#include <jsi/jsi.h>
#include <react/renderer/components/rnreanimated/EventEmitters.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/rnreanimated/ReanimatedViewState.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutContext.h>

namespace facebook::react {

JSI_EXPORT extern const char ReanimatedViewComponentName[];

using ReanimatedViewShadowNodeBase = ConcreteViewShadowNode<
    ReanimatedViewComponentName,
    ReanimatedViewProps,
    ReanimatedViewEventEmitter,
    ReanimatedViewState>;

class ReanimatedShadowNode final : public ReanimatedViewShadowNodeBase {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;
  void layout(LayoutContext layoutContext) override;
};

} // namespace facebook::react
