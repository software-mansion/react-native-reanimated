#include <reanimated/CSS/interpolation/TransitionStyleInterpolator.h>

namespace reanimated {

TransitionStyleInterpolator::TransitionStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Array &propertyNames,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : viewStylesRepository_(viewStylesRepository),
      interpolators_(build(rt, propertyNames, viewStylesRepository)) {}

void TransitionStyleInterpolator::updateProperties(
    jsi::Runtime &rt,
    const jsi::Array &propertyNames) {
  // Convert propertyNames array to an unordered_set for O(1) lookups
  std::unordered_set<std::string> propertyNameSet;
  size_t propertyNamesCount = propertyNames.size(rt);

  propertyNameSet.reserve(propertyNamesCount);
  for (size_t i = 0; i < propertyNamesCount; ++i) {
    propertyNameSet.insert(
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt));
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
  size_t propertiesCount = propertyNames_.size();
  propertyNames_ = std::vector<std::string>();
  propertyNames_.reserve(propertiesCount);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const auto propertyName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    propertyNames_.emplace_back(propertyName);
    if (interpolators_.find(propertyName) == interpolators_.cend()) {
      addProperty(rt, propertyName);
    }
  }
}

jsi::Value TransitionStyleInterpolator::update(
    jsi::Runtime &rt,
    const std::unordered_map<std::string, InterpolationUpdateContext>
        &contexts) {
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

ObjectPropertiesInterpolators TransitionStyleInterpolator::build(
    jsi::Runtime &rt,
    const jsi::Array &propertyNames,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  ObjectPropertiesInterpolators interpolators;

  size_t propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const std::string propertyName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    // interpolators_[propertyName] = createInterpolator(rt, propertyName);
  }

  return interpolators;
}

void TransitionStyleInterpolator::addProperty(
    jsi::Runtime &rt,
    const std::string &propertyName) {
  auto interpolator = interpolators_.find(propertyName);

  if (interpolator != interpolators_.cend()) {
    throw std::invalid_argument(
        "[Reanimated] Interpolator for property: " + propertyName +
        " already exists");
  }

  // interpolators_[propertyName] = createInterpolator(rt, propertyName);
}

void TransitionStyleInterpolator::removeProperty(
    const std::string &propertyName) {
  interpolators_.erase(propertyName);
}

// TODO - uncomment this when keyframes won't have to be passed to the factory
// function
// std::shared_ptr<Interpolator>
// TransitionStyleInterpolator::createInterpolator(
//     jsi::Runtime &rt,
//     const std::string &propertyName) {
//   const auto factory = styleInterpolatorFactories.find(propertyName);

//   if (factory == styleInterpolatorFactories.cend()) {
//     throw std::invalid_argument(
//         "[Reanimated] No matching interpolator factory found for property: "
//         + propertyName);
//   }

//   return factory->second(rt, viewStylesRepository_, {propertyName});
// }

} // namespace reanimated
