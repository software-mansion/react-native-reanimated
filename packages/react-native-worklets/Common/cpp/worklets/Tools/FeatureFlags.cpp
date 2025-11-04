#include <worklets/Tools/FeatureFlags.h>

#include <string>
#include <unordered_map>

namespace worklets {

std::unordered_map<std::string, bool> DynamicFeatureFlags::flags_;

bool DynamicFeatureFlags::getFlag(const std::string &name) {
  return flags_.contains(name) && flags_[name];
}

void DynamicFeatureFlags::setFlag(const std::string &name, bool value) {
  flags_[name] = value;
}

} // namespace worklets
