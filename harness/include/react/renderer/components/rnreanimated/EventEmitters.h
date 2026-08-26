#pragma once

#include <react/renderer/components/view/ViewEventEmitter.h>

namespace facebook::react {

class REASharedTransitionBoundaryEventEmitter final : public ViewEventEmitter {
 public:
  using ViewEventEmitter::ViewEventEmitter;
};

} // namespace facebook::react
