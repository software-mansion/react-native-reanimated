#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>
#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <optional>

namespace reanimated::css {

/// Matches the payload shapes RN emits for PlatformColor and DynamicColorIOS.
/// Keep it strict: any other object should still fail to construct rather than
/// be taken for a platform color and handed back to RN unresolved.
bool isPlatformColorPayload(const folly::dynamic &value);
bool isPlatformColorPayload(jsi::Runtime &rt, const jsi::Value &value);

namespace detail {

/// False where no resolver exists, so callers skip the memoization entirely.
bool canResolvePlatformColors();

/// Raw per-platform resolution, called only on a cache miss. Apple ignores the
/// node: a window with its own overrideUserInterfaceStyle is not honoured.
std::optional<ColorChannels> resolvePlatformColorUncached(
    const folly::dynamic &value,
    const std::shared_ptr<const facebook::react::ShadowNode> &node);

/// Bumped whenever previously resolved colors stop being valid. Constant where
/// canResolvePlatformColors() is false.
uint64_t appearanceGeneration();

} // namespace detail

/// Memoized per (payload, surface, appearance): an animated color resolves on
/// every interpolated frame.
std::optional<ColorChannels> resolvePlatformColor(
    const folly::dynamic &value,
    const std::shared_ptr<const facebook::react::ShadowNode> &node);

} // namespace reanimated::css
