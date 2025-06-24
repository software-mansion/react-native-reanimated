#pragma once
#include <string>
#include <unordered_map>

namespace reanimated {
namespace StaticFeatureFlags {

#ifdef REANIMATED_FEATURE_FLAGS
#define STRINGIFY(x) #x
#define TOSTRING(x) STRINGIFY(x)
#define REANIMATED_FEATURE_FLAGS_STRING TOSTRING(REANIMATED_FEATURE_FLAGS)
  constexpr bool getFlag(const char* key) {
    const std::string keyStr = key;
    std::string featureFlags = REANIMATED_FEATURE_FLAGS_STRING;
    if (featureFlags.find(key) == std::string::npos) {
      // this will cause compilation error not runtime error
      throw std::logic_error("Unable to recognize flag: " + keyStr);
    }
    return featureFlags.find("const" + keyStr + "=true") != std::string::npos;
  }
#else
  constexpr bool getFlag(const char*) {
    return false;
  }
#endif

} // namespace StaticFeatureFlags

class DynamicFeatureFlags {
  static std::unordered_map<std::string, bool> flags_;
  public:
    static bool getFlag(const std::string& key) {
      return flags_.find(key) != flags_.end() && flags_[key];
    }
    static void setFlag(const std::string& key, bool value) {
      flags_[key] = value;
    }
};

} // namespace reanimated