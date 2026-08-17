#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <string>

namespace reanimated::css {

bool isDiscreteProperty(const std::string &propName, const std::string &nativeComponentName);

/// Decodes RN's processColor output (packed ARGB int, possibly signed) into RGBA channels.
ColorChannels extractColorChannels(int64_t numberValue);

} // namespace reanimated::css
