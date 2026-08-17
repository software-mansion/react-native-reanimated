#pragma once

#include <reanimated/NativeAnimations/NativeAnimationTypes.h>

#include <optional>
#include <unordered_map>
#include <vector>

namespace reanimated::native_animation {

enum class AnimationDriverKind : uint8_t {
  Native,
  External,
};

struct AnimationClaim {
  SurfaceId surfaceId;
  Tag tag;
  AnimationTargetClaim target;
  AnimationHandle owner;
  AnimationDriverKind driver;
};

class NativeAnimationTargetRegistry {
 public:
  std::vector<AnimationClaim> conflicts(
      SurfaceId surfaceId,
      Tag tag,
      const std::vector<AnimationTargetClaim> &targets,
      std::optional<AnimationHandle> ignoredOwner = std::nullopt) const;

  void
  claim(const AnimationHandle &owner, AnimationDriverKind driver, const std::vector<AnimationTargetClaim> &targets);
  void release(const AnimationHandle &owner);
  void release(const AnimationHandle &owner, const std::vector<AnimationTargetClaim> &targets);
  std::vector<AnimationClaim> claimsFor(const AnimationHandle &owner) const;
  void clearSurface(SurfaceId surfaceId);

  bool hasRetainedExitGuard(SurfaceId surfaceId, Tag tag) const;
  void addRetainedExitGuard(const AnimationHandle &owner);
  void removeRetainedExitGuard(const AnimationHandle &owner);

 private:
  struct ViewKey {
    SurfaceId surfaceId;
    Tag tag;

    bool operator==(const ViewKey &) const = default;
  };

  struct ViewKeyHash {
    size_t operator()(const ViewKey &key) const noexcept;
  };

  struct ViewState {
    std::vector<AnimationClaim> claims;
    std::optional<AnimationHandle> retainedExitGuard;
  };

  ViewState *findViewState(const ViewKey &key);
  const ViewState *findViewState(const ViewKey &key) const;
  void eraseViewIfEmpty(const ViewKey &key);

  std::unordered_map<ViewKey, ViewState, ViewKeyHash> viewStates_;
};

} // namespace reanimated::native_animation
