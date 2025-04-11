#pragma once

#include "States.h"
#include <react/renderer/components/rnreanimated/EventEmitters.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <jsi/jsi.h>
#include <react/renderer/core/LayoutContext.h>

namespace facebook::react {

JSI_EXPORT extern const char ReanimatedViewComponentName[];

using ReanimatedViewShadowNode = ConcreteViewShadowNode<
    ReanimatedViewComponentName,
    ReanimatedViewProps,
    ReanimatedViewEventEmitter,
    ReanimatedViewState>;

class ReanimatedViewCustomShadowNode final : public ReanimatedViewShadowNode {
public:
    using ConcreteViewShadowNode::ConcreteViewShadowNode;
    void layout(LayoutContext layoutContext) override;
};

} // namespace facebook::react
