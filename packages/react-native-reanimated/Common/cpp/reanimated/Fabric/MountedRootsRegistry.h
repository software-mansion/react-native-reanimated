#pragma once

#include <react/renderer/components/root/RootShadowNode.h>

#include <unordered_map>

namespace reanimated {

using namespace facebook::react;

/// Keeps the last mounted root of each running surface.
class MountedRootsRegistry {
 public:
  void set(const RootShadowNode::Shared &rootShadowNode);
  void remove(SurfaceId surfaceId);
  RootShadowNode::Shared get(SurfaceId surfaceId) const;
  bool isMounted(const ShadowNodeFamily &shadowNodeFamily) const;

 private:
  std::unordered_map<SurfaceId, RootShadowNode::Shared> rootsBySurface_;
};

} // namespace reanimated
