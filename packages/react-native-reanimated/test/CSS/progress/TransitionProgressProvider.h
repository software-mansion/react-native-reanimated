#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RawProgressProvider.h>
#include <reanimated/CSS/utils/props.h>

#include <limits>
#include <memory>
#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated::css {

enum class TransitionProgressState { Pending, Running, Finished };

class TransitionPropertyProgressProvider final
    : public KeyframeProgressProvider,
      public RawProgressProvider {
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

class TransitionProgressProvider final {
 public:
  TransitionProgressState getState() const;
  double getMinDelay(double timestamp) const;
  TransitionPropertyProgressProviders getPropertyProgressProviders() const;
  std::unordered_set<std::string> getRemovedProperties() const;

  void discardFinishedProgressProviders();
  void discardIrrelevantProgressProviders(
      const std::unordered_set<std::string> &transitionPropertyNames);
  void runProgressProviders(
      double timestamp,
      const CSSTransitionPropertiesSettings &propertiesSettings,
      const PropertyNames &changedPropertyNames,
      const std::unordered_set<std::string> &reversedPropertyNames);
  void update(double timestamp);

 private:
  TransitionPropertyProgressProviders propertyProgressProviders_;

  std::unordered_set<std::string> removedProperties_;

  std::shared_ptr<TransitionPropertyProgressProvider>
  createReversingShorteningProgressProvider(
      double timestamp,
      const CSSTransitionPropertySettings &propertySettings,
      const TransitionPropertyProgressProvider &existingProgressProvider);
};

} // namespace reanimated::css
