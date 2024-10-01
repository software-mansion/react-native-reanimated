#pragma once

#include <reanimated/CSS/CSSTransition.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

namespace reanimated {

class CSSTransitionsRegistry : public UpdatesRegistry {
 public:
  bool hasRunningTransitions() const;
};

} // namespace reanimated
