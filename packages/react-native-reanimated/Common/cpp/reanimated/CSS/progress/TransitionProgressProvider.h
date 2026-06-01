#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RawProgressProvider.h>
#include <reanimated/CSS/utils/props.h>
#include <reanimated/CSS/utils/reversingShortening.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

enum class TransitionProgressState : std::uint8_t { Idle, Pending, Running };

class TransitionPropertyProgressProvider final : public KeyframeProgressProvider, public RawProgressProvider {
 public:
  TransitionPropertyProgressProvider(double timestamp, double duration, double delay, EasingConfig easing);
  TransitionPropertyProgressProvider(
      double timestamp,
      double duration,
      double delay,
      EasingConfig easing,
      double reversingShorteningFactor);

  double getGlobalProgress() const override;
  double getKeyframeProgress(double fromOffset, double toOffset) const override;
  double getRemainingDelay(double timestamp) const;
  ReversingState getReversingState() const;
  TransitionProgressState getState() const;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  EasingConfig easing_;
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

  void runProgressProvider(const std::string &propertyName, bool isReversed, double timestamp);
  void removeProperties(const std::vector<std::string> &propertyNames);
  void removeProperty(const std::string &propertyName);
  void discardFinishedProgressProviders();
  void update(double timestamp);
  void setPropertySettings(const PropertiesSettingsMap &changedPropertiesSettings);
  CSSTransitionPropertySettings getPropertySettings(const std::string &propertyName) const;

 private:
  TransitionPropertyProgressProviders propertyProgressProviders_;

  // TO DO: currently never cleaned by design - if the property has already been transitioned in the past, we might want
  // to reuse the config (run without settings in the config).
  /// We might want to add an option for clearing those settings in the future.
  PropertiesSettingsMap propertySettings_;

  std::unordered_set<std::string> removedProperties_;

  std::shared_ptr<TransitionPropertyProgressProvider> createReversingShorteningProgressProvider(
      double timestamp,
      const CSSTransitionPropertySettings &propertySettings,
      const TransitionPropertyProgressProvider &existingProgressProvider);
};

} // namespace reanimated::css
