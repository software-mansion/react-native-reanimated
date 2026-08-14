#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

namespace reanimated::css {

/// Matches the payload shapes RN emits for PlatformColor and DynamicColorIOS.
/// CSSPlatformColor is tried before CSSColor, so a loose match here would
/// swallow ordinary colors.
bool isPlatformColorPayload(const folly::dynamic &value);
bool isPlatformColorPayload(jsi::Runtime &rt, const jsi::Value &value);

} // namespace reanimated::css
