#pragma once

#include <react/renderer/core/ShadowNode.h>

namespace reanimated {

using namespace facebook;
using namespace react;

class StaticPropsRegistry {
 public:
  void set(jsi::Runtime &rt, const Tag viewTag, const jsi::Value &props);
  folly::dynamic get(const Tag viewTag) const;
  void remove(const Tag viewTag);

 private:
  std::unordered_map<Tag, folly::dynamic> registry_;
};

} // namespace reanimated
