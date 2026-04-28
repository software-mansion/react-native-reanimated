#include <reanimated/CSS/registries/StaticPropsRegistry.h>

namespace reanimated::css {

void StaticPropsRegistry::set(jsi::Runtime &rt, const Tag viewTag, const jsi::Value &props) {
  if (props.isNull() || props.isUndefined()) {
    remove(viewTag);
  } else {
    registry_[viewTag] = dynamicFromValue(rt, props);
  }
}

folly::dynamic StaticPropsRegistry::get(const Tag viewTag) const {
  auto it = registry_.find(viewTag);
  if (it == registry_.end()) {
    return nullptr;
  }
  return it->second;
}

void StaticPropsRegistry::remove(const Tag viewTag) {
  registry_.erase(viewTag);
}

bool StaticPropsRegistry::isEmpty() const {
  return registry_.empty();
}

} // namespace reanimated::css
