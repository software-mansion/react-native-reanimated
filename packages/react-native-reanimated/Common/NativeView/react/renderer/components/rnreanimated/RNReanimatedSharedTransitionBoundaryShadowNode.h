#pragma once

#include <jsi/jsi.h>
#include <react/renderer/components/rnreanimated/EventEmitters.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutContext.h>

#include "RNReanimatedSharedTransitionBoundaryState.h"

namespace facebook::react {

JSI_EXPORT extern const char RNReanimatedSharedTransitionBoundaryComponentName[];

/*
 * `ShadowNode` for <RNReanimatedSharedTransitionBoundary> component.
 */
class RNReanimatedSharedTransitionBoundaryShadowNode final : public ConcreteViewShadowNode<
                                                                 RNReanimatedSharedTransitionBoundaryComponentName,
                                                                 RNReanimatedSharedTransitionBoundaryProps,
                                                                 RNReanimatedSharedTransitionBoundaryEventEmitter,
                                                                 RNReanimatedSharedTransitionBoundaryState> {
 public:
  RNReanimatedSharedTransitionBoundaryShadowNode(
      const ShadowNodeFragment &fragment,
      const ShadowNodeFamily::Shared &family,
      ShadowNodeTraits traits)
      : ConcreteViewShadowNode(fragment, family, traits) {
    initialize();
  }

  RNReanimatedSharedTransitionBoundaryShadowNode(const ShadowNode &sourceShadowNode, const ShadowNodeFragment &fragment)
      : ConcreteViewShadowNode(sourceShadowNode, fragment) {
    initialize();
  }

  void layout(LayoutContext layoutContext) override;
  void appendChild(const std::shared_ptr<const ShadowNode> &child) override;

 private:
  void initialize();
  void prepareChildren();
};

} // namespace facebook::react
