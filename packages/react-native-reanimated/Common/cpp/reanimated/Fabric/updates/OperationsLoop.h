#pragma once

#include <reanimated/Tools/PlatformDepMethodsHolder.h>

#include <worklets/Compat/StableApi.h>

#include <memory>

namespace reanimated::css {
class CSSAnimationsRegistry;
class CSSTransitionsRegistry;
} // namespace reanimated::css

namespace reanimated {

class UpdatesRegistryManager;

class OperationsLoop : public std::enable_shared_from_this<OperationsLoop> {
 public:
  OperationsLoop(
      const std::shared_ptr<worklets::UIScheduler> &uiScheduler,
      const RequestRenderFunction &requestRender,
      const GetAnimationTimestampFunction &getTimestamp,
      const std::shared_ptr<css::CSSAnimationsRegistry> &cssAnimationsRegistry,
      const std::shared_ptr<css::CSSTransitionsRegistry> &cssTransitionsRegistry,
      const std::shared_ptr<UpdatesRegistryManager> &updatesRegistryManager);

  // Returns the cached frame timestamp while the loop is running; otherwise fetches a fresh one.
  double resolveTimestamp();

  // Starts the loop if it's not already running.
  void run();

  [[nodiscard]]
  bool isRunning() const {
    return running_;
  }

  bool shouldUpdateCssAnimations() const;

  void clearShouldUpdateCssAnimations();

 private:
  const std::shared_ptr<worklets::UIScheduler> uiScheduler_;
  const RequestRenderFunction requestRender_;
  const GetAnimationTimestampFunction getTimestamp_;
  const std::shared_ptr<css::CSSAnimationsRegistry> cssAnimationsRegistry_;
  const std::shared_ptr<css::CSSTransitionsRegistry> cssTransitionsRegistry_;
  const std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager_;

  bool running_{false};
  double currentTimestamp_{0};
  bool shouldUpdateCssAnimations_{true};

  void onRender();
  bool hasPendingUpdates() const;
};

} // namespace reanimated
