#pragma once

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/progress/common/TimeProgressProviderBase.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

enum class TransitionProgressState { Pending, Running, Finished };

class TransitionPropertyProgressProvider final
    : public KeyframeProgressProvider,
      public TimeProgressProviderBase {
 public:
  TransitionPropertyProgressProvider(
      double timestamp,
      double duration,
      double delay,
      const EasingFunction &easingFunction);
  TransitionPropertyProgressProvider(
      double timestamp,
      double duration,
      double delay,
      const EasingFunction &easingFunction,
      double reversingShorteningFactor);

  double getGlobalProgress() const override;
  double getKeyframeProgress(double fromOffset, double toOffset) const override;
  double getRemainingDelay(double timestamp) const;
  double getReversingShorteningFactor() const;
  TransitionProgressState getState() const;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  EasingFunction easingFunction_;
  double reversingShorteningFactor_ = 1;

  double getElapsedTime(double timestamp) const;
};

using TransitionPropertyProgressProviders = std::unordered_map<
    std::string,
    std::shared_ptr<TransitionPropertyProgressProvider>>;

} // namespace reanimated::css
