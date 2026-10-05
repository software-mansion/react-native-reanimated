#pragma once

#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/NativeAnimations/NativeAnimationHost.h>

#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <unordered_map>
#include <vector>

namespace reanimated {

/// What the UI runtime must do with a layout animation build that plays natively.
struct NativeLayoutBuildEnd {
  uint64_t buildId;
  /// The result for the callback of the build. Absent when the end only releases the build.
  std::optional<bool> callbackResult;
  /// No track of the build plays, so the UI runtime can drop its graph.
  bool isReleased;
};

using NativeLayoutBuildEnds = std::vector<NativeLayoutBuildEnd>;

/// The layout client of the native animation host for one surface. Each view has at most one logical group:
/// the physical tracks that its current layout animation needs, and the build whose callback they complete.
/// The generation of a command is the id of its build. A build stays on the UI runtime until the host reports
/// the end of each of its tracks and its callback has its result.
class NativeLayoutGroups final : public native_animation::NativeAnimationClient {
 public:
  /// Gets the build ends that a host report causes. UI thread only.
  using BuildEndListener = std::function<void(NativeLayoutBuildEnds)>;

  NativeLayoutGroups(std::shared_ptr<native_animation::NativeAnimationHost> host, BuildEndListener onBuildsEnded);

  /// The request becomes the group of its view. The tracks of the old group that the request does not replace
  /// join it with their keys. Gives the end of the old group, whose callback result is `false`.
  /// `retargetConfig` is the layout animation that the request plays. It is null for a request that plays an
  /// entering animation, because a frame change of the view does not start that animation again.
  std::optional<NativeLayoutBuildEnd> start(
      const native_animation::AnimationRequest &request,
      std::shared_ptr<worklets::Serializable> retargetConfig);
  /// The tracks that the group of the view waits for.
  std::vector<native_animation::TrackKey> members(facebook::react::Tag tag);
  /// False when the host cannot play a track of the group of `view` on that view any more
  /// (`NativeAnimationHost::canRealize`).
  bool canContinueOn(const facebook::react::ShadowView &view);
  /// The layout animation that a frame change of the view starts while its group plays. Null when the view
  /// has no group, or when its group plays an entering animation.
  std::shared_ptr<worklets::Serializable> retargetConfig(facebook::react::Tag tag);
  /// Stops each track of the group of the view. Gives the end of the group, whose callback result is `false`.
  std::optional<NativeLayoutBuildEnd> cancel(facebook::react::Tag tag);
  /// Ends all groups with `false` and releases all builds. The host stops the tracks when the surface closes.
  NativeLayoutBuildEnds clear();

  void onAnimationAdmitted(const native_animation::AnimationHandle &handle) override;
  void onTrackEnded(const native_animation::TrackKey &track, bool finished) override;
  void onAnimationEnded(const native_animation::AnimationHandle &handle, native_animation::AnimationResult result)
      override;

 private:
  struct Member {
    native_animation::TrackKey key;
    native_animation::AnimationTrack track;
  };

  struct Group {
    uint64_t buildId;
    std::shared_ptr<worklets::Serializable> retargetConfig;
    std::vector<Member> members;
    /// The tracks that the command of the group stops at its admission. They play until then.
    std::vector<native_animation::TrackKey> replacedAtAdmission;
  };
  using GroupMap = std::unordered_map<facebook::react::Tag, Group>;

  static std::vector<native_animation::TrackKey> keysOf(const std::vector<Member> &members);
  /// The end of a group that is no longer in `groups_`. The lock is held.
  NativeLayoutBuildEnd groupEnd(uint64_t buildId, bool callbackResult) const;
  /// Stops the tracks of the group and removes it. Gives its end. The lock is held.
  NativeLayoutBuildEnd fail(GroupMap::iterator groupIt);

  const std::shared_ptr<native_animation::NativeAnimationHost> host_;
  const BuildEndListener onBuildsEnded_;
  std::mutex mutex_;
  GroupMap groups_;
  /// For each build with such tracks, the number of its tracks with no end report from the host.
  std::unordered_map<uint64_t, size_t> liveTrackCounts_;
};

} // namespace reanimated
