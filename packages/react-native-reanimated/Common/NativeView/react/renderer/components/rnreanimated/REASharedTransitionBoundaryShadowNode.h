#pragma once

#include <jsi/jsi.h>
#include <react/renderer/components/rnreanimated/EventEmitters.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutContext.h>

#include "REASharedTransitionBoundaryState.h"

namespace facebook::react {

JSI_EXPORT extern const char REASharedTransitionBoundaryComponentName[];

/*
 * `ShadowNode` for <REASharedTransitionBoundary> component.
 */
class REASharedTransitionBoundaryShadowNode final : public ConcreteViewShadowNode<
                                                        REASharedTransitionBoundaryComponentName,
                                                        REASharedTransitionBoundaryProps,
                                                        REASharedTransitionBoundaryEventEmitter,
                                                        REASharedTransitionBoundaryState> {
 public:
  REASharedTransitionBoundaryShadowNode(
      const ShadowNodeFragment &fragment,
      const ShadowNodeFamily::Shared &family,
      ShadowNodeTraits traits)
      : ConcreteViewShadowNode(fragment, family, traits) {
    initialize();
  }

  REASharedTransitionBoundaryShadowNode(const ShadowNode &sourceShadowNode, const ShadowNodeFragment &fragment)
      : ConcreteViewShadowNode(sourceShadowNode, fragment) {
    initialize();
  }

 private:
  void initialize();
};

} // namespace facebook::react
