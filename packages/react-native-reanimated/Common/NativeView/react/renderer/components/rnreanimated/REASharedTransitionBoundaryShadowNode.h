#pragma once

#include <jsi/jsi.h>
#include <react/renderer/components/rnreanimated/EventEmitters.h>
#include <react/renderer/components/rnreanimated/Props.h>
#if __has_include(<React/View.h>)
#include <React/View.h>
#else
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#endif
#if __has_include(<React/RendererCore.h>)
#include <React/RendererCore.h>
#else
#include <react/renderer/core/LayoutContext.h>
#endif

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

  void layout(LayoutContext layoutContext) override;

 private:
  void initialize();
};

} // namespace facebook::react
