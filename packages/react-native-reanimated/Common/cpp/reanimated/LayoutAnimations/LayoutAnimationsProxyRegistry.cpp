#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <react/renderer/mounting/ShadowTree.h>

#include <algorithm>
#include <utility>
#include <vector>

namespace reanimated {

LayoutAnimationsProxyRegistry::LayoutAnimationsProxyRegistry(LayoutAnimationsProxyFactory proxyFactory)
    : proxyFactory_(std::move(proxyFactory)) {}

std::shared_ptr<LayoutAnimationsProxyCommon> LayoutAnimationsProxyRegistry::registerSurface(
    const facebook::react::ShadowTree &shadowTree) {
  assertUpdatesRegistryUnlocked();
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
  assertUpdatesRegistryUnlocked();
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
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return {};
  }
  for (const auto &instance : instances()) {
    if (const auto surfaceId = instance->onTransitionProgress(tag, progress, isClosing, isGoingForward)) {
      return surfaceId;
    }
  }
  return {};
}

std::optional<SurfaceId> LayoutAnimationsProxyRegistry::onGestureCancel(const int tag) {
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return {};
  }
  for (const auto &instance : instances()) {
    if (const auto surfaceId = instance->onGestureCancel(tag)) {
      return surfaceId;
    }
  }
  return {};
}

// Called outside the updates registry lock: a pull holds the layout animations lock while it reads synchronous props.
void LayoutAnimationsProxyRegistry::releaseSharedTransitionConfigs(
    const std::vector<Tag> &removedTags,
    LayoutAnimationsManager &layoutAnimationsManager) const {
  if constexpr (!StaticFeatureFlags::getFlag("ENABLE_SHARED_ELEMENT_TRANSITIONS")) {
    return;
  }
  if (removedTags.empty()) {
    return;
  }
  const auto proxies = instances();
  std::vector<Tag> released;
  for (const auto tag : removedTags) {
    if (std::ranges::none_of(
            proxies, [tag](const auto &proxy) { return proxy->deferSharedTransitionConfigRelease(tag); })) {
      released.push_back(tag);
    }
  }
  layoutAnimationsManager.clearSharedTransitionConfigs(released);
}

void LayoutAnimationsProxyRegistry::onSharedTransitionConfigured(const std::vector<Tag> &viewTags) const {
  for (const auto &instance : instances()) {
    instance->onSharedTransitionConfigured(viewTags);
  }
}

void LayoutAnimationsProxyRegistry::flushLayoutAnimationOperations() const {
  for (const auto &instance : instances()) {
    instance->flushLayoutAnimationOperations();
  }
}

void LayoutAnimationsProxyRegistry::applySynchronousProps(
    const UpdatesBatch &updatesBatch,
    const bool trackInLightTree) {
  for (const auto &instance : instances()) {
    instance->applySynchronousProps(updatesBatch, trackInLightTree);
  }
}

void LayoutAnimationsProxyRegistry::composeSynchronousProps(UpdatesBatch &updatesBatch) const {
  for (const auto &instance : instances()) {
    instance->composeSynchronousProps(updatesBatch);
  }
}

void LayoutAnimationsProxyRegistry::prepareBackendOpacityUpdates(
    AnimationMutations &mutations,
    const UpdatesBatch &updates) const {
  for (const auto &instance : instances()) {
    instance->prepareBackendOpacityUpdates(mutations, updates);
  }
}

std::vector<std::shared_ptr<LayoutAnimationsProxyCommon>> LayoutAnimationsProxyRegistry::instances() const {
  assertUpdatesRegistryUnlocked();
  const std::lock_guard<std::mutex> lock(instancesMutex_);
  std::vector<std::shared_ptr<LayoutAnimationsProxyCommon>> instances;
  instances.reserve(instances_.size());
  for (const auto &[_, instance] : instances_) {
    instances.push_back(instance);
  }
  return instances;
}

} // namespace reanimated
