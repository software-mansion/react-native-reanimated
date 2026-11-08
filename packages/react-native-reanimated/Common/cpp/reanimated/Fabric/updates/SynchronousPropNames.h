#pragma once

#include <algorithm>
#include <array>
#include <string>
#include <string_view>

namespace reanimated {

// A constant array, not a function-local static container: a static is destroyed by `exit()`,
// which on macOS runs on a watchdog thread while the UI thread can still be calling this.
inline constexpr auto kSynchronousPropNames = std::to_array<std::string_view>({
    "opacity",
    "elevation",
    "shadowColor",
#if __APPLE__
    "shadowOffset",
    "shadowOpacity",
    "shadowRadius",
#endif // __APPLE__
    "backgroundColor",
    // "color", // not supported
    "tintColor",
    "placeholderTextColor",
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderTopStartRadius",
    "borderTopEndRadius",
    "borderBottomLeftRadius",
    "borderBottomRightRadius",
    "borderBottomStartRadius",
    "borderBottomEndRadius",
    "borderStartStartRadius",
    "borderStartEndRadius",
    "borderEndStartRadius",
    "borderEndEndRadius",
    "borderColor",
    "borderTopColor",
    "borderBottomColor",
    "borderLeftColor",
    "borderRightColor",
    "borderStartColor",
    "borderEndColor",
    "borderBlockColor",
    "borderBlockStartColor",
    "borderBlockEndColor",
    "outlineColor",
    "outlineOffset",
    "outlineWidth",
    "transform",
});

inline bool isSynchronousPropName(const std::string &name) {
  return std::find(kSynchronousPropNames.begin(), kSynchronousPropNames.end(), name) != kSynchronousPropNames.end();
}

} // namespace reanimated
