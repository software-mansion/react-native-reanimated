#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>

#include <react/renderer/mounting/ShadowTree.h>

#include <utility>

namespace reanimated {

LayoutAnimationsProxyRegistry::LayoutAnimationsProxyRegistry(LayoutAnimationsProxyFactory proxyFactory)
    : proxyFactory_(std::move(proxyFactory)) {}

std::shared_ptr<LayoutAnimationsProxyCommon> LayoutAnimationsProxyRegistry::registerSurface(
    const facebook::react::ShadowTree &shadowTree) {
  const std::lock_guard<std::mutex> lock(instancesMutex_);
  const auto surfaceId = shadowTree.getSurfaceId();
  const auto existing = instances_.find(surfaceId);
  if (existing != instances_.end()) {
    return existing->second;
  }

  auto instance = proxyFactory_(surfaceId);
  instance->startSurface(shadowTree, instance);
  instances_.emplace(surfaceId, instance);
  return instance;
}

void LayoutAnimationsProxyRegistry::remove(const SurfaceId surfaceId) {
  std::shared_ptr<LayoutAnimationsProxyCommon> instance;
  {
    const std::lock_guard<std::mutex> lock(instancesMutex_);
    const auto it = instances_.find(surfaceId);
    if (it == instances_.end()) {
      return;
    }
    instance = std::move(it->second);
    instances_.erase(it);
  }
  instance->surfaceDidUnmount();
}

std::optional<SurfaceId> LayoutAnimationsProxyRegistry::progressLayoutAnimation(
    const int tag,
    const jsi::Object &newStyle) {
  for (const auto &instance : instances()) {
    if (const auto surfaceId = instance->progressLayoutAnimation(tag, newStyle)) {
      return surfaceId;
    }
  }
  return {};
}

std::optional<SurfaceId> LayoutAnimationsProxyRegistry::endLayoutAnimation(const int tag, const bool shouldRemove) {
  for (const auto &instance : instances()) {
    if (const auto surfaceId = instance->endLayoutAnimation(tag, shouldRemove)) {
      return surfaceId;
    }
  }
  return {};
}

std::optional<SurfaceId> LayoutAnimationsProxyRegistry::onTransitionProgress(
    const int tag,
    const double progress,
    const bool isClosing,
    const bool isGoingForward) {
  for (const auto &instance : instances()) {
    if (const auto surfaceId = instance->onTransitionProgress(tag, progress, isClosing, isGoingForward)) {
      return surfaceId;
    }
  }
  return {};
}

std::optional<SurfaceId> LayoutAnimationsProxyRegistry::onGestureCancel(const int tag) {
  for (const auto &instance : instances()) {
    if (const auto surfaceId = instance->onGestureCancel(tag)) {
      return surfaceId;
    }
  }
  return {};
}

std::vector<std::shared_ptr<LayoutAnimationsProxyCommon>> LayoutAnimationsProxyRegistry::instances() const {
  const std::lock_guard<std::mutex> lock(instancesMutex_);
  std::vector<std::shared_ptr<LayoutAnimationsProxyCommon>> instances;
  instances.reserve(instances_.size());
  for (const auto &[_, instance] : instances_) {
    instances.push_back(instance);
  }
  return instances;
}

} // namespace reanimated
