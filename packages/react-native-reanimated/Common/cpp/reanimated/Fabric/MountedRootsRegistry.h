#pragma once

#include <react/renderer/components/root/RootShadowNode.h>

#include <unordered_map>

namespace reanimated {

using namespace facebook::react;

/// Tracks running surfaces and their last mounted roots.
class MountedRootsRegistry {
 public:
  void registerSurface(SurfaceId surfaceId);
  void set(const RootShadowNode::Shared &rootShadowNode);
  void remove(SurfaceId surfaceId);
  RootShadowNode::Shared get(SurfaceId surfaceId) const;
  bool isRunning(SurfaceId surfaceId) const;
  bool isMounted(const ShadowNodeFamily &shadowNodeFamily) const;
  /// Whether the view is inside a `display: none` subtree of the last mounted root.
  /// With `includeSelf` set to false, only the ancestors of the view are checked.
  bool isHidden(const ShadowNodeFamily &shadowNodeFamily, bool includeSelf) const;

 private:
  std::unordered_map<SurfaceId, RootShadowNode::Shared> rootsBySurface_;
};

} // namespace reanimated
