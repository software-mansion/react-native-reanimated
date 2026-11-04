#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <folly/dynamic.h>
#include <jsi/jsi.h>

namespace reanimated::css {

/// Matches the payload shapes RN emits for PlatformColor and DynamicColorIOS.
/// Keep it strict: any other object should still fail to construct rather than
/// be taken for a platform color and handed back to RN unresolved.
bool isPlatformColorPayload(const folly::dynamic &value);
bool isPlatformColorPayload(jsi::Runtime &rt, const jsi::Value &value);

} // namespace reanimated::css
