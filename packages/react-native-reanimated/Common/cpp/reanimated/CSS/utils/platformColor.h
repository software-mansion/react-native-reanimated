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

/// Raw per-platform resolution, called only on a cache miss. Apple ignores the
/// surface: a window with its own overrideUserInterfaceStyle is not honoured.
std::optional<ColorChannels> resolvePlatformColorForNode(
    const folly::dynamic &value,
    const std::shared_ptr<const facebook::react::ShadowNode> &node);

/// Bumped whenever previously resolved colors stop being valid. Apple tracks
/// appearance changes; Android has no equivalent signal, so a theme change
/// there is only picked up when the surface is recreated.
uint64_t appearanceGeneration();

} // namespace detail

/// Memoized per (payload, surface, appearance): an animated color resolves on
/// every interpolated frame. Returns nullopt, and warns once, when the platform
/// cannot resolve the payload.
std::optional<ColorChannels> resolvePlatformColor(
    const folly::dynamic &value,
    const std::shared_ptr<const facebook::react::ShadowNode> &node);

} // namespace reanimated::css
