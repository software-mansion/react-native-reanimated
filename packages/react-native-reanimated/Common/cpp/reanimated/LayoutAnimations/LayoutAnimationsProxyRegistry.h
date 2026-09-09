#pragma once

#include <react/renderer/mounting/ShadowTree.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>

#include <functional>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <vector>

namespace reanimated {

using LayoutAnimationsProxyFactory =
    std::function<std::shared_ptr<LayoutAnimationsProxyCommon>(facebook::react::SurfaceId)>;

class LayoutAnimationsProxyRegistry {
 public:
  explicit LayoutAnimationsProxyRegistry(LayoutAnimationsProxyFactory proxyFactory);

  std::shared_ptr<LayoutAnimationsProxyCommon> registerSurface(const facebook::react::ShadowTree &shadowTree);
  void remove(SurfaceId surfaceId);

  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle);
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove);
  std::optional<SurfaceId> onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward);
  std::optional<SurfaceId> onGestureCancel(int tag);
  void flushLayoutAnimationOperations() const;

 private:
  std::vector<std::shared_ptr<LayoutAnimationsProxyCommon>> instances() const;

  const LayoutAnimationsProxyFactory proxyFactory_;
  mutable std::mutex instancesMutex_;
  std::unordered_map<SurfaceId, std::shared_ptr<LayoutAnimationsProxyCommon>> instances_;
};

} // namespace reanimated
