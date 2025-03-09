#pragma once

#include <reanimated/CSS/config/CSSAnimationConfig.h>
#include <reanimated/CSS/progress/animation/AnimationTimeProgressProvider.h>
#include <reanimated/CSS/util/DelayedItemsManager.h>

#include <memory>
#include <unordered_set>

namespace reanimated::css {

class AnimationTimeProgressProvidersManager final {
 public:
  using ProviderShared = std::shared_ptr<AnimationTimeProgressProvider>;

  bool empty() const;

  void run(const ProviderShared &progressProvider, double timestamp);
  void updateAndRun(
      const ProviderShared &progressProvider,
      const PartialCSSAnimationSettings &settings,
      double timestamp);
  void erase(const ProviderShared &progressProvider);

  void update(double timestamp);

 private:
  std::unordered_set<ProviderShared> runningProgressProviders_;
  std::unordered_set<ProviderShared> recentlyUpdatedProgressProviders_;
  DelayedItemsManager<ProviderShared> delayedProgressProvidersManager_;

  void activateDelayedProviders(double timestamp);
};

} // namespace reanimated::css
