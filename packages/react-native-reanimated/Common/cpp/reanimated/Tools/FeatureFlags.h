#pragma once
#include <string>
#include <unordered_map>

namespace reanimated {

class StaticFeatureFlags {
 public:
#ifdef REANIMATED_FEATURE_FLAGS

#define STRINGIFY(x) #x
#define TOSTRING(x) STRINGIFY(x)
#define REANIMATED_FEATURE_FLAGS_STRING TOSTRING(REANIMATED_FEATURE_FLAGS)

  static constexpr bool getFlag(const char *key) {
    const std::string keyStr = key;
    std::string featureFlags = REANIMATED_FEATURE_FLAGS_STRING;
    if (featureFlags.find(key) == std::string::npos) {
      // this will cause compilation error not runtime error
      throw std::logic_error("Unable to recognize flag: " + keyStr);
    }
    return featureFlags.find("[" + keyStr + ":true]") != std::string::npos;
  }

#else

  static constexpr bool getFlag(const char *) {
    return false;
  }

#endif
};

class DynamicFeatureFlags {
  static std::unordered_map<std::string, bool> flags_;

 public:
  static bool getFlag(const char *key);
  static void setFlag(const std::string &key, bool value);
};

} // namespace reanimated
