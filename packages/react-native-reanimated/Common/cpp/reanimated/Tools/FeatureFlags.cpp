#include <reanimated/Tools/FeatureFlags.h>

#include <mutex>
#include <string>
#include <unordered_map>

namespace reanimated {

std::mutex DynamicFeatureFlags::mutex_;
std::unordered_map<std::string, bool> DynamicFeatureFlags::flags_;

bool DynamicFeatureFlags::getFlag(const std::string &name) {
  const std::lock_guard<std::mutex> lock(mutex_);
  const auto it = flags_.find(name);
  return it != flags_.end() && it->second;
}

void DynamicFeatureFlags::setFlag(const std::string &name, bool value) {
  const std::lock_guard<std::mutex> lock(mutex_);
  flags_[name] = value;
}

} // namespace reanimated
