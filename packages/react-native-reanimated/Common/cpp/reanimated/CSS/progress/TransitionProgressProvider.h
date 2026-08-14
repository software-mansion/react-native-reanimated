#pragma once

#include <reanimated/CSS/configs/CSSTransitionConfig.h>
#include <reanimated/CSS/progress/KeyframeProgressProvider.h>
#include <reanimated/CSS/progress/RunLifecycle.h>
#include <reanimated/CSS/progress/TimeProgressProvider.h>
#include <reanimated/CSS/utils/props.h>
#include <reanimated/CSS/utils/reversingShortening.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated::css {

enum class TransitionProgressState : std::uint8_t { Idle, Pending, Running };

class TransitionPropertyProgressProvider final : public KeyframeProgressProvider, public TimeProgressProvider {
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

  /// Time the property has run by the given milestone, in milliseconds.
  double elapsedTimeAt(MilestoneTime time) const;

  void setMilestoneReporter(RunLifecycle::Reporter reporter);
  void abort(double timestamp);
  void update(double timestamp) override;

 protected:
  std::optional<double> calculateRawProgress(double timestamp) override;

 private:
  EasingConfig easing_;
  EasingFunction easingFunction_;
  double reversingShorteningFactor_ = 1;

  RunLifecycle lifecycle_;
  // The lifecycle reports an abort without a timestamp, so abort() leaves one here.
  double cancelTimestamp_ = 0;

  double intervalStart() const;
  double getElapsedTime(double timestamp) const;
  RunPhase computePhase() const;
};

using TransitionPropertyProgressProviders =
    std::unordered_map<std::string, std::shared_ptr<TransitionPropertyProgressProvider>>;

class TransitionProgressProvider final {
 public:
  /// Reports a milestone of one property, with the time elapsed by then.
  using MilestoneReporter = std::function<void(RunMilestone, const std::string &property, double elapsedTime)>;

  TransitionProgressState getState() const;
  double getMinDelay(double timestamp) const;
  TransitionPropertyProgressProviders getPropertyProgressProviders() const;
  std::unordered_set<std::string> getRemovedProperties() const;

  void setMilestoneReporter(MilestoneReporter reporter);

  void runProgressProvider(const std::string &propertyName, bool isReversed, double timestamp);
  void abort(double timestamp);
  void removeProperties(const std::vector<std::string> &propertyNames, double timestamp);
  void removeProperty(const std::string &propertyName, double timestamp);
  void discardFinishedProgressProviders();
  void update(double timestamp);
  void setPropertySettings(const PropertiesSettingsMap &changedPropertiesSettings);
  CSSTransitionPropertySettings getPropertySettings(const std::string &propertyName) const;

 private:
  TransitionPropertyProgressProviders propertyProgressProviders_;
  MilestoneReporter reporter_;

  void observeProperty(const std::string &propertyName, TransitionPropertyProgressProvider &provider);

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
