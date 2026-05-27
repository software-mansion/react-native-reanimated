#include <reanimated/CSS/registries/StaticPropsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <react/debug/react_native_assert.h>

namespace reanimated::css {

void StaticPropsRegistry::set(jsi::Runtime &rt, const Tag viewTag, const jsi::Value &props) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  if (props.isNull() || props.isUndefined()) {
    registry_.erase(viewTag);
  } else {
    registry_[viewTag] = dynamicFromValue(rt, props);
  }
}

folly::dynamic StaticPropsRegistry::get(const Tag viewTag) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return nullptr;
  }
  return it->second;
}

void StaticPropsRegistry::remove(const Tag viewTag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  registry_.erase(viewTag);
}

bool StaticPropsRegistry::isEmpty() const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  return registry_.empty();
}

} // namespace reanimated::css
