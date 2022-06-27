#ifdef RCT_NEW_ARCH_ENABLED

#include "PropsRegistry.h"

using namespace facebook::react;

namespace reanimated {

std::lock_guard<std::mutex> PropsRegistry::createLock() const {
  return std::lock_guard<std::mutex>(mutex_);
}

void PropsRegistry::set(
    ShadowNode::Shared shadowNode,
    std::shared_ptr<jsi::Value> props) {
  map_[shadowNode->getTag()] = std::make_pair(shadowNode, props);
}

void PropsRegistry::for_each(std::function<void(
                                 ShadowNodeFamily const &family,
                                 std::shared_ptr<jsi::Value> props)> callback) {
  for (const auto &pair : map_) {
    const ShadowNodeFamily &family = pair.second.first->getFamily();
    std::shared_ptr<jsi::Value> props = pair.second.second;
    callback(family, props);
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
