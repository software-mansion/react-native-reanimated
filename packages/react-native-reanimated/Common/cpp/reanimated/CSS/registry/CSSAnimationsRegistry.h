#pragma once

#include <reanimated/CSS/registry/CSSRegistry.h>

namespace reanimated {

class CSSAnimationsRegistry
    : public CSSRegistry<CSSAnimation, AnimationOperation> {
 public:
  CSSAnimationsRegistry(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);

 protected:
  jsi::Value handleUpdate(
      jsi::Runtime &rt,
      const time_t timestamp,
      const std::shared_ptr<CSSAnimation> &item) override;
  void handleOperation(
      jsi::Runtime &rt,
      const AnimationOperation operation,
      const std::shared_ptr<CSSAnimation> &item,
      const time_t timestamp) override;

  void addOperation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation,
      const time_t timestamp) override;
  void removeOperation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation) override;
  void activateOperation(const unsigned id) override;
  void deactivateOperation(
      const std::shared_ptr<CSSAnimation> &animation,
      const time_t timestamp) override;
  void finishOperation(
      jsi::Runtime &rt,
      const std::shared_ptr<CSSAnimation> &animation,
      const time_t timestamp);

 private:
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

} // namespace reanimated
