#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    const std::vector<std::string> &propertyNames,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository),
      interpolators_(build(propertyNames, viewStylesRepository)) {}

void TransitionStyleInterpolator::updateProperties(
    const std::vector<std::string> &propertyNames) {
  // Convert propertyNames array to an unordered_set for O(1) lookups
  std::unordered_set<std::string> propertyNameSet;
  propertyNameSet.reserve(propertyNames.size());
  for (const auto &propertyName : propertyNames) {
    propertyNameSet.insert(propertyName);
  }

  // Remove properties that are not present in the propertyNames array
  for (auto it = interpolators_.begin(); it != interpolators_.end();) {
    if (!propertyNameSet.contains(it->first)) {
      it = interpolators_.erase(it);
    } else {
      ++it;
    }
  }

  // Add properties that are present in the properties array but not in the
  // interpolators map
  for (const auto &propertyName : propertyNames) {
    if (interpolators_.find(propertyName) == interpolators_.cend()) {
      addProperty(propertyName);
    }
  }
}

jsi::Value TransitionStyleInterpolator::update(
    const std::unordered_map<std::string, InterpolationUpdateContext>
        &contexts) {
  if (contexts.empty()) {
    return jsi::Value::undefined();
  }
  jsi::Runtime &rt = contexts.cbegin()->second.rt;
  jsi::Object result(rt);
  bool allUndefined = true;

  for (const auto &[propName, context] : contexts) {
    auto interpolator = interpolators_.find(propName);

    // This should never happen, as we should create respective interpolators
    // before calling the update method
    if (interpolator == interpolators_.cend()) {
      throw std::invalid_argument(
          "[Reanimated] No interpolator found for property: " + propName);
    }

    jsi::Value value = interpolator->second->update(context);

    if (!value.isUndefined()) {
      allUndefined = false;
    }

    result.setProperty(context.rt, propName.c_str(), value);
  }

  if (allUndefined) {
    return jsi::Value::undefined();
  }

  return result;
}

PropertiesInterpolators TransitionStyleInterpolator::build(
    const std::vector<std::string> &propertyNames,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  PropertiesInterpolators interpolators;

  for (const auto &propertyName : propertyNames) {
    interpolators.emplace(propertyName, createInterpolator(propertyName));
  }

  return interpolators;
}

void TransitionStyleInterpolator::addProperty(const std::string &propertyName) {
  auto interpolator = interpolators_.find(propertyName);

  if (interpolator != interpolators_.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Interpolator for property: " + propertyName +
        " already exists");
  }

  interpolators_.emplace(propertyName, createInterpolator(propertyName));
}

void TransitionStyleInterpolator::removeProperty(
    const std::string &propertyName) {
  interpolators_.erase(propertyName);
}

std::shared_ptr<Interpolator> TransitionStyleInterpolator::createInterpolator(
    const std::string &propertyName) {
  const auto factory = styleInterpolatorFactories.find(propertyName);

  if (factory == styleInterpolatorFactories.cend()) {
    throw std::invalid_argument(
        "[Reanimated] No matching interpolator factory found for property: " +
        propertyName);
  }

  return factory->second(viewStylesRepository_, {propertyName});
}

} // namespace reanimated
