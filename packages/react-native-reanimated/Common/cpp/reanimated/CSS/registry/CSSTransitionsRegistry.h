#pragma once

#include <reanimated/CSS/registry/CSSRegistry.h>
#include <reanimated/CSS/util/props.h>

namespace reanimated {

class CSSTransitionsRegistry
    : public CSSRegistry<CSSTransition, TransitionOperation> {
 public:
  CSSTransitionsRegistry(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry);

  void add(const std::shared_ptr<CSSTransition> &transition) override;
  void remove(const unsigned id) override;

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

 private:
  std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;

  PropsObserver createPropsObserver(const unsigned id);
};

} // namespace reanimated
