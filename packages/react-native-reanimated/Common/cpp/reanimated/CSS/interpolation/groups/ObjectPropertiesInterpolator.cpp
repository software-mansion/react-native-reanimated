#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>

namespace reanimated {

void ObjectPropertiesInterpolator::setKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  // TODO - add a possibility to remove interpolators that are no longer used
  // (for now, for simplicity, we only add new ones)
  const jsi::Object keyframesObject = keyframes.getObject(rt);

  jsi::Array propertyNames = keyframesObject.getPropertyNames(rt);
  size_t propertiesCount = propertyNames.size(rt);

  for (size_t i = 0; i < propertiesCount; ++i) {
    const std::string propertyName =
        propertyNames.getValueAtIndex(rt, i).asString(rt).utf8(rt);
    const jsi::Value &keyframes = keyframesObject.getProperty(
        rt, jsi::PropNameID::forUtf8(rt, propertyName));

    addOrUpdateInterpolator(rt, propertyName, keyframes);
  }
}

jsi::Value ObjectPropertiesInterpolator::mapInterpolators(
    jsi::Runtime &rt,
    std::function<jsi::Value(Interpolator &)> callback) const {
  jsi::Object result(rt);
  bool allUndefined = true;

  for (const auto &[propName, interpolator] : interpolators_) {
    jsi::Value value = callback(*interpolator);

    if (!value.isUndefined()) {
      allUndefined = false;
    }

    result.setProperty(rt, propName.c_str(), value);
  }

  if (allUndefined) {
    return jsi::Value::undefined();
  }

  return result;
}

} // namespace reanimated
