#pragma once
#include <string>
#include <unordered_map>

namespace worklets {

class StaticFeatureFlags {
 public:
#ifdef WORKLETS_FEATURE_FLAGS

// Convert the value under x into a string
#define XTOSTRING(x) #x
// Evaluate the flag value; without this step, it would stringify the flag name
// itself instead of the flag value
#define TOSTRING(x) XTOSTRING(x)

  static consteval bool getFlag(const std::string_view &name) {
    std::string nameStr = name.data();
    std::string featureFlags = TOSTRING(WORKLETS_FEATURE_FLAGS);
    if (featureFlags.find("[" + nameStr + ":") == std::string::npos) {
      throw std::logic_error("Unable to recognize flag: " + nameStr);
    }
    return featureFlags.find("[" + nameStr + ":true]") != std::string::npos;
  }

#else

  static consteval bool getFlag(const std::string_view &) {
    return false;
  }

#endif
};

class DynamicFeatureFlags {
 public:
  static bool getFlag(const std::string &name);
  static void setFlag(const std::string &name, bool value);

 private:
  static std::unordered_map<std::string, bool> flags_;
};

} // namespace worklets
