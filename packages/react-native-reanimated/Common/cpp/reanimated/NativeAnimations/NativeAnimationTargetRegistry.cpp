#include <reanimated/NativeAnimations/NativeAnimationTargetRegistry.h>

#include <react/utils/hash_combine.h>

#include <algorithm>

namespace reanimated::native_animation {

size_t NativeAnimationTargetRegistry::ViewKeyHash::operator()(const ViewKey &key) const noexcept {
  return facebook::react::hash_combine(key.surfaceId, key.tag);
}

NativeAnimationTargetRegistry::ViewState *NativeAnimationTargetRegistry::findViewState(const ViewKey &key) {
  const auto view = viewStates_.find(key);
  return view != viewStates_.end() ? &view->second : nullptr;
}

const NativeAnimationTargetRegistry::ViewState *NativeAnimationTargetRegistry::findViewState(const ViewKey &key) const {
  const auto view = viewStates_.find(key);
  return view != viewStates_.end() ? &view->second : nullptr;
}

std::vector<AnimationClaim> NativeAnimationTargetRegistry::conflicts(
    const SurfaceId surfaceId,
    const Tag tag,
    const std::vector<AnimationTargetClaim> &targets,
    const std::optional<AnimationHandle> ignoredOwner) const {
  std::vector<AnimationClaim> result;
  const auto *view = findViewState({surfaceId, tag});
  if (view == nullptr) {
    return result;
  }
  for (const auto &claim : view->claims) {
    if (ignoredOwner && claim.owner == *ignoredOwner) {
      continue;
    }
    if (std::ranges::any_of(
            targets, [&](const AnimationTargetClaim &target) { return targetsConflict(claim.target, target); })) {
      result.push_back(claim);
    }
  }
  return result;
}

void NativeAnimationTargetRegistry::claim(
    const AnimationHandle &owner,
    const AnimationDriverKind driver,
    const std::vector<AnimationTargetClaim> &targets) {
  auto &claims = viewStates_[{owner.surfaceId, owner.tag}].claims;
  claims.reserve(claims.size() + targets.size());
  for (const auto &target : targets) {
    claims.push_back(AnimationClaim{owner.surfaceId, owner.tag, target, owner, driver});
  }
}

void NativeAnimationTargetRegistry::release(const AnimationHandle &owner) {
  const ViewKey key{owner.surfaceId, owner.tag};
  auto *view = findViewState(key);
  if (view == nullptr) {
    return;
  }
  std::erase_if(view->claims, [&](const AnimationClaim &claim) { return claim.owner == owner; });
  if (view->retainedExitGuard == owner) {
    view->retainedExitGuard.reset();
  }
  eraseViewIfEmpty(key);
}

void NativeAnimationTargetRegistry::release(
    const AnimationHandle &owner,
    const std::vector<AnimationTargetClaim> &targets) {
  const ViewKey key{owner.surfaceId, owner.tag};
  auto *view = findViewState(key);
  if (view == nullptr) {
    return;
  }
  std::erase_if(view->claims, [&](const AnimationClaim &claim) {
    return claim.owner == owner &&
        std::ranges::any_of(targets, [&](const AnimationTargetClaim &target) { return claim.target == target; });
  });
  eraseViewIfEmpty(key);
}

std::vector<AnimationClaim> NativeAnimationTargetRegistry::claimsFor(const AnimationHandle &owner) const {
  std::vector<AnimationClaim> result;
  const auto *view = findViewState({owner.surfaceId, owner.tag});
  if (view == nullptr) {
    return result;
  }
  std::ranges::copy_if(
      view->claims, std::back_inserter(result), [&](const AnimationClaim &claim) { return claim.owner == owner; });
  return result;
}

void NativeAnimationTargetRegistry::clearSurface(const SurfaceId surfaceId) {
  std::erase_if(viewStates_, [surfaceId](const auto &entry) { return entry.first.surfaceId == surfaceId; });
}

bool NativeAnimationTargetRegistry::hasRetainedExitGuard(const SurfaceId surfaceId, const Tag tag) const {
  const auto *view = findViewState({surfaceId, tag});
  return view != nullptr && view->retainedExitGuard.has_value();
}

void NativeAnimationTargetRegistry::addRetainedExitGuard(const AnimationHandle &owner) {
  viewStates_[{owner.surfaceId, owner.tag}].retainedExitGuard = owner;
}

void NativeAnimationTargetRegistry::removeRetainedExitGuard(const AnimationHandle &owner) {
  const ViewKey key{owner.surfaceId, owner.tag};
  auto *view = findViewState(key);
  if (view == nullptr) {
    return;
  }
  if (view->retainedExitGuard == owner) {
    view->retainedExitGuard.reset();
  }
  eraseViewIfEmpty(key);
}

void NativeAnimationTargetRegistry::eraseViewIfEmpty(const ViewKey &key) {
  const auto view = viewStates_.find(key);
  if (view != viewStates_.end() && view->second.claims.empty() && !view->second.retainedExitGuard) {
    viewStates_.erase(view);
  }
}

} // namespace reanimated::native_animation
