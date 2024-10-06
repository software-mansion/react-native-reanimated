#pragma once

#include <reanimated/CSS/registry/CSSRegistry.h>

namespace reanimated {

class CSSTransitionsRegistry
    : public CSSRegistry<CSSTransition, TransitionOperation> {
 protected:
  jsi::Value handleUpdate(
      jsi::Runtime &rt,
      const time_t timestamp,
      const std::shared_ptr<CSSTransition> &transition) override;
  void handleOperation(
      jsi::Runtime &rt,
      const TransitionOperation operation,
      const std::shared_ptr<CSSTransition> &transition,
      const time_t timestamp) override;

  void addOperation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSTransition> &transition,
      const time_t timestamp) override;
  void removeOperation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSTransition> &transition) override;
  void activateOperation(const unsigned id) override;
  void deactivateOperation(
      const std::shared_ptr<CSSTransition> &transition,
      const time_t timestamp) override;
};

} // namespace reanimated
