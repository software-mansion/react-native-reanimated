#include <reanimated/CSS/utils/platformColor.h>

namespace reanimated::css {

namespace {

bool isPlainObject(jsi::Runtime &rt, const jsi::Value &value) {
  if (!value.isObject()) {
    return false;
  }

  const auto object = value.getObject(rt);
  return !object.isArray(rt) && !object.isFunction(rt);
}

bool isArrayProperty(const folly::dynamic &value, const char *name) {
  const auto *property = value.get_ptr(name);
  return property != nullptr && property->isArray();
}

bool isArrayProperty(jsi::Runtime &rt, const jsi::Object &object, const char *name) {
  const auto property = object.getProperty(rt, name);
  return property.isObject() && property.getObject(rt).isArray(rt);
}

} // namespace

bool isPlatformColorPayload(const folly::dynamic &value) {
  if (!value.isObject()) {
    return false;
  }

  if (isArrayProperty(value, "semantic") || isArrayProperty(value, "resource_paths")) {
    return true;
  }

  const auto *dynamicColor = value.get_ptr("dynamic");
  return dynamicColor != nullptr && dynamicColor->isObject();
}

bool isPlatformColorPayload(jsi::Runtime &rt, const jsi::Value &value) {
  if (!isPlainObject(rt, value)) {
    return false;
  }

  const auto object = value.getObject(rt);
  if (isArrayProperty(rt, object, "semantic") || isArrayProperty(rt, object, "resource_paths")) {
    return true;
  }

  return isPlainObject(rt, object.getProperty(rt, "dynamic"));
}

} // namespace reanimated::css
