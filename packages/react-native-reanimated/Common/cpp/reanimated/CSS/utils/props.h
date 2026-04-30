#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <cstdint>
#include <string>

namespace reanimated::css {

bool isDiscreteProperty(const std::string &propName, const std::string &nativeComponentName);

// Decodes RN's processColor output (ARGB packed: (A << 24) | (R << 16) |
// (G << 8) | B) into 8-bit RGBA channels. Handles the Android case where
// colors above 2^31 arrive as signed negatives - JS's `| 0` step makes the
// number signed-int32, so we cast through int32_t before widening to
// uint32_t to preserve the bit pattern.
ColorChannels extractColorChannels(int64_t numberValue);

} // namespace reanimated::css
