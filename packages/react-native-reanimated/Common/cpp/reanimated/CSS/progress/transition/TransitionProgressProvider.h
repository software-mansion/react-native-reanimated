#pragma once

#include <reanimated/CSS/progress/transition/TransitionPropertyProgressProvider.h>

#include <limits>
#include <memory>
#include <string>
#include <unordered_set>

namespace reanimated::css {

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
