#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

#include <folly/dynamic.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>

namespace reanimated {

using namespace facebook::react;

#ifndef NDEBUG
class StaleSynchronousPropsTracker {
 public:
  void record(Tag tag, const folly::dynamic &props);
  void forget(Tag tag);
  void forget(Tag tag, const folly::dynamic &props);
  std::optional<Tag> find(const std::shared_ptr<LightNode> &node, LayoutAnimationType type) const;
  std::optional<std::string> takeWarning(Tag tag, Tag staleTag, LayoutAnimationType type);

 private:
  std::unordered_map<Tag, std::unordered_set<std::string>> propNames_;
  std::unordered_set<Tag> warnedTags_;
};
#else
class StaleSynchronousPropsTracker {
 public:
  void record(Tag, const folly::dynamic &) {}
  void forget(Tag) {}
  void forget(Tag, const folly::dynamic &) {}
  std::optional<Tag> find(const std::shared_ptr<LightNode> &, LayoutAnimationType) const {
    return std::nullopt;
  }
  std::optional<std::string> takeWarning(Tag, Tag, LayoutAnimationType) {
    return std::nullopt;
  }
};
#endif

} // namespace reanimated
