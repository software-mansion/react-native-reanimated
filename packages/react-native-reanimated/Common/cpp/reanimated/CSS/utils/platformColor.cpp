#include <reanimated/CSS/utils/platformColor.h>

#include <folly/json.h>

#include <mutex>
#include <string>
#include <unordered_map>

#ifndef NDEBUG
#ifdef ANDROID
#include <android/log.h>
#else
#include <iostream>
#endif // ANDROID
#endif // NDEBUG

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

/// Built by hand because folly::toJson iterates keys in unspecified order, so
/// its output is not a stable key.
std::string
cacheKey(const folly::dynamic &value, const facebook::react::SurfaceId surfaceId, const uint64_t generation) {
  std::string key = std::to_string(generation) + '\x1f' + std::to_string(surfaceId);

  for (const auto *name : {"semantic", "resource_paths"}) {
    if (const auto *names = value.get_ptr(name)) {
      for (const auto &entry : *names) {
        key += '\x1f' + (entry.isString() ? entry.getString() : "?");
      }
      return key;
    }
  }

  if (const auto *dynamicColor = value.get_ptr("dynamic")) {
    for (const auto *field : {"light", "dark", "highContrastLight", "highContrastDark"}) {
      const auto *channel = dynamicColor->get_ptr(field);
      key += '\x1f' + (channel != nullptr && channel->isNumber() ? std::to_string(channel->asInt()) : "-");
    }
  }
  return key;
}

/// Once per process: where no implementation exists every payload fails, and
/// this runs on every interpolated frame.
void warnUnresolvable([[maybe_unused]] const folly::dynamic &value) {
#ifndef NDEBUG
  static std::once_flag warned;
  std::call_once(warned, [&value] {
    const auto message = "[Reanimated] Cannot resolve the platform color " + folly::toJson(value) +
        " while animating it, so the animation steps between its endpoints.";
#ifdef ANDROID
    __android_log_print(ANDROID_LOG_WARN, "Reanimated", "%s", message.c_str());
#else
    std::cerr << message << std::endl;
#endif // ANDROID
  });
#endif // NDEBUG
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

std::optional<ColorChannels> resolvePlatformColor(
    const folly::dynamic &value,
    const std::shared_ptr<const facebook::react::ShadowNode> &node) {
  if (node == nullptr) {
    return std::nullopt;
  }

  static std::mutex mutex;
  static std::unordered_map<std::string, ColorChannels> cache;
  static uint64_t cachedGeneration = 0;

  const auto surfaceId = node->getSurfaceId();
  const auto generation = detail::appearanceGeneration();
  const auto key = cacheKey(value, surfaceId, generation);
  {
    std::lock_guard<std::mutex> lock(mutex);
    if (generation != cachedGeneration) {
      cache.clear();
      cachedGeneration = generation;
    }
    const auto cached = cache.find(key);
    if (cached != cache.end()) {
      return cached->second;
    }
  }

  const auto channels = detail::resolvePlatformColorForNode(value, node);
  if (!channels) {
    warnUnresolvable(value);
    return std::nullopt;
  }

  std::lock_guard<std::mutex> lock(mutex);
  if (generation == cachedGeneration) {
    cache.emplace(key, *channels);
  }
  return channels;
}

#if !defined(__APPLE__)

namespace detail {

/// Resolution is Apple-only so far - everything else keeps the discrete switch
/// and the one-time warning above.
std::optional<ColorChannels> resolvePlatformColorForNode(
    const folly::dynamic & /*value*/,
    const std::shared_ptr<const facebook::react::ShadowNode> & /*node*/) {
  return std::nullopt;
}

uint64_t appearanceGeneration() {
  return 0;
}

} // namespace detail

#endif // !defined(__APPLE__)

} // namespace reanimated::css
