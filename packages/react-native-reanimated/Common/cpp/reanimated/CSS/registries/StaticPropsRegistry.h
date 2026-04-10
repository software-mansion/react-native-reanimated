#pragma once

#include <react/renderer/core/ShadowNode.h>

#include <unordered_map>

namespace reanimated::css {

using namespace facebook;
using namespace react;

class StaticPropsRegistry {
 public:
  void set(jsi::Runtime &rt, Tag viewTag, const jsi::Value &props);
  folly::dynamic get(Tag viewTag) const;
  void remove(Tag viewTag);
  bool isEmpty() const;

 private:
  std::unordered_map<Tag, folly::dynamic> registry_;
};

} // namespace reanimated::css
