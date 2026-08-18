#include <reanimated/CSS/utils/platformColor.h>

#include <folly/json.h>
#include <glog/logging.h>

#include <mutex>
#include <string>
#include <unordered_map>

namespace reanimated::css {

namespace {

constexpr size_t maxCachedResolutions = 256;

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
      key += '\x1f';
      key += name;
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

void warnUnresolvable([[maybe_unused]] const folly::dynamic &value) {
#ifndef NDEBUG
  static std::once_flag warned;
  std::call_once(warned, [&value] {
    LOG(WARNING) << "[Reanimated] Cannot resolve the platform color " << folly::toJson(value)
                 << " while animating it, so the animation steps between its endpoints.";
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
  if (node == nullptr || !detail::canResolvePlatformColors()) {
    warnUnresolvable(value);
    return std::nullopt;
  }

  static std::mutex mutex;
  static std::unordered_map<std::string, ColorChannels> cache;
  static uint64_t cachedGeneration = 0;

  const auto generation = detail::appearanceGeneration();
  const auto key = cacheKey(value, node->getSurfaceId(), generation);
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

  const auto channels = detail::resolvePlatformColorUncached(value, node);
  if (!channels) {
    warnUnresolvable(value);
    return std::nullopt;
  }

  std::lock_guard<std::mutex> lock(mutex);
  if (generation == cachedGeneration) {
    // The key space is app-supplied, so cap it instead of trusting it.
    if (cache.size() >= maxCachedResolutions) {
      cache.clear();
    }
    cache.emplace(key, *channels);
  }
  return channels;
}

#if !defined(__APPLE__)

namespace detail {

bool canResolvePlatformColors() {
  return false;
}

std::optional<ColorChannels> resolvePlatformColorUncached(
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
