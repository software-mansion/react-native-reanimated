#pragma once
#include <folly/dynamic.h>
#include <cstdint>
#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <vector>
namespace facebook::react {
using Tag = int;
using SurfaceId = int;
struct RootShadowNode {
  using Shared = std::shared_ptr<const RootShadowNode>;
  int id;
  SurfaceId surface = 1;
  SurfaceId getSurfaceId() const {
    return surface;
  }
};
struct ShadowNodeFamily {
  using Shared = std::shared_ptr<ShadowNodeFamily>;
  Tag tag;
  SurfaceId surface;
  Tag getTag() const {
    return tag;
  }
  SurfaceId getSurfaceId() const {
    return surface;
  }
  std::vector<int> getAncestors(const RootShadowNode &) const {
    return {1};
  }
};
struct ShadowNode {
  ShadowNodeFamily::Shared family;
  Tag getTag() const {
    return family->tag;
  }
  ShadowNodeFamily::Shared getFamilyShared() const {
    return family;
  }
};
struct RawProps {
  folly::dynamic value;
  explicit RawProps(const folly::dynamic &v) : value(v) {}
  operator folly::dynamic() const {
    return value;
  }
};
} // namespace facebook::react
namespace reanimated {
using namespace facebook::react;
using PropsMap = std::unordered_map<ShadowNodeFamily::Shared, std::vector<RawProps>>;
} // namespace reanimated
