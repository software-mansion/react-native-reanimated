#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RawProgressProvider.h>
#include <reanimated/CSS/utils/props.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>

namespace reanimated::css {

enum class TransitionProgressState : std::uint8_t { Pending, Running, Finished };

class TransitionPropertyProgressProvider final : public KeyframeProgressProvider, public RawProgressProvider {
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

using TransitionPropertyProgressProviders =
    std::unordered_map<std::string, std::shared_ptr<TransitionPropertyProgressProvider>>;

class TransitionProgressProvider final {
 public:
  TransitionProgressState getState() const;
  double getMinDelay(double timestamp) const;
  TransitionPropertyProgressProviders getPropertyProgressProviders() const;
  std::unordered_set<std::string> getRemovedProperties() const;

  void runProgressProvider(
      const std::string &propertyName,
      const CSSTransitionPropertySettings &settings,
      bool isReversed,
      double timestamp);
  void removeProperty(const std::string &propertyName);
  void discardFinishedProgressProviders();
  void update(double timestamp);

 private:
  TransitionPropertyProgressProviders propertyProgressProviders_;

  std::unordered_set<std::string> removedProperties_;

  std::shared_ptr<TransitionPropertyProgressProvider> createReversingShorteningProgressProvider(
      double timestamp,
      const CSSTransitionPropertySettings &propertySettings,
      const TransitionPropertyProgressProvider &existingProgressProvider);
};

} // namespace reanimated::css
