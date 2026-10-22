#pragma once

#include <react/renderer/mounting/ShadowTree.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.h>

#include <cstdint>
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
  void surfaceDidMount(SurfaceId surfaceId) const;
  /// The platform mount report `dispatch` ran: the transactions of the pulls that it reports are on the host
  /// views. It does not name their surfaces. UI thread only.
  void pulledSurfacesDidMount(std::uint64_t dispatch) const;
  void remove(SurfaceId surfaceId);

  std::optional<SurfaceId> progressLayoutAnimation(int tag, const jsi::Object &newStyle);
  std::optional<SurfaceId> endLayoutAnimation(int tag, bool shouldRemove);
  std::optional<SurfaceId> onTransitionProgress(int tag, double progress, bool isClosing, bool isGoingForward);
  std::optional<SurfaceId> onGestureCancel(int tag);
  void onSharedTransitionConfigured(const std::vector<Tag> &viewTags) const;
  void flushLayoutAnimationOperations() const;
  void applySynchronousProps(const UpdatesBatch &updatesBatch, bool trackInLightTree);

 private:
  std::vector<std::shared_ptr<LayoutAnimationsProxyCommon>> instances() const;

  const LayoutAnimationsProxyFactory proxyFactory_;
  mutable std::mutex instancesMutex_;
  std::unordered_map<SurfaceId, std::shared_ptr<LayoutAnimationsProxyCommon>> instances_;
};

} // namespace reanimated
