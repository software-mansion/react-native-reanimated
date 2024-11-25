#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/config/CSSTransitionConfig.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RawProgressProvider.h>
#include <reanimated/CSS/util/props.h>

#include <limits>
#include <memory>
#include <queue>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

namespace reanimated {

enum class TransitionProgressState { PENDING, RUNNING, FINISHED };

class TransitionPropertyProgressProvider final
    : public KeyframeProgressProvider,
      public RawProgressProvider {
 public:
  TransitionPropertyProgressProvider(
      double timestamp,
      double duration,
      double delay,
      const EasingFunction &easingFunction);

  double getGlobalProgress() const override {
    return rawProgress_.value_or(0);
  }
  bool isFirstUpdate() const override {
    return !previousRawProgress_.has_value();
  }
  double getKeyframeProgress(double fromOffset, double toOffset) const override;
  TransitionProgressState getState() const;
  double getRemainingDelay(double timestamp) const;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  EasingFunction easingFunction_;

  double getElapsedTime(double timestamp) const;
};

using TransitionPropertyProgressProviders = std::unordered_map<
    std::string,
    std::shared_ptr<TransitionPropertyProgressProvider>>;

class TransitionProgressProvider final {
 public:
  explicit TransitionProgressProvider(
      const CSSTransitionPropertiesSettings &settings);

  void setSettings(const CSSTransitionPropertiesSettings &settings) {
    settings_ = settings;
  }

  TransitionProgressState getState() const;
  double getMinDelay(double timestamp) const;
  TransitionPropertyProgressProviders getPropertyProgressProviders() const {
    return propertyProgressProviders_;
  }
  std::unordered_set<std::string> getPropertiesToRemove() const {
    return propertiesToRemove_;
  }

  void discardIrrelevantProgressProviders(
      const std::unordered_set<std::string> &transitionPropertyNames);
  void runProgressProviders(
      jsi::Runtime &rt,
      double timestamp,
      const PropertyNames &changedPropertyNames);
  void update(double timestamp);

 private:
  CSSTransitionPropertiesSettings settings_;

  std::unordered_set<std::string> propertiesToRemove_;

  TransitionPropertyProgressProviders propertyProgressProviders_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
