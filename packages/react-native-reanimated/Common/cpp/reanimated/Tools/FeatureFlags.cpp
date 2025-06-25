#include <reanimated/Tools/FeatureFlags.h>

namespace reanimated {

std::unordered_map<std::string, bool> DynamicFeatureFlags::flags_;

bool DynamicFeatureFlags::getFlag(const char *key) {
  return flags_.find(key) != flags_.end() && flags_[key];
}

void DynamicFeatureFlags::setFlag(const std::string &key, bool value) {
  flags_[key] = value;
}

} // namespace reanimated
