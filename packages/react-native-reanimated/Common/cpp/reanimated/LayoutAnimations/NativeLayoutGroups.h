#pragma once

#include <reanimated/Compat/WorkletsApi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationType.h>
#include <reanimated/NativeAnimations/NativeAnimationHost.h>

#include <functional>
#include <memory>
#include <mutex>
#include <optional>
#include <unordered_map>
#include <vector>

namespace reanimated {

/// What the frame driver needs to play a layout animation that the native host stopped before its end.
struct FrameDriverHandover {
  facebook::react::Tag tag;
  LayoutAnimationType type;
  std::shared_ptr<worklets::Serializable> config;
  /// The tracks of older builds that the group of the view had.
  std::vector<native_animation::TrackKey> joinedTracks;
};

/// What the layout proxy must do with a layout animation build that plays natively.
struct NativeLayoutBuildEnd {
  uint64_t buildId;
  /// The result for the callback of the build. Absent when the end only releases the build.
  std::optional<bool> callbackResult;
  /// The host has no track of the build, so the UI runtime can drop its graph.
  bool isReleased;
  /// The view whose exiting animation the build played, when that animation gets its result here. The view
  /// can then leave.
  std::optional<facebook::react::Tag> exitedTag;
  /// Has a value when the owner can play the build on the frame driver in place of this end: the build is on
  /// the UI runtime and its callback has no result until the owner applies this end.
  std::optional<FrameDriverHandover> frameDriverHandover;
};

using NativeLayoutBuildEnds = std::vector<NativeLayoutBuildEnd>;

/// The end of a removed group and its commands to stop.
struct NativeLayoutGroupCancel {
  NativeLayoutBuildEnd end;
  /// The commands with a track of the group. The caller stops them: the owner of a pull in the mount report
  /// of that pull (`NativeAnimationHost::runAfterMount`), so the mounted state and the stop reach the screen
  /// together.
  std::vector<native_animation::AnimationHandle> commandsToStop;
};

/// The layout client of the native animation host for one surface. Each view has at most one logical group:
/// the physical tracks that its current layout animation needs, and the build whose callback they complete.
/// The generation of a command is the id of its build. A build stays on the UI runtime until the host has no
/// track of it and its callback has its result.
///
/// The host holds the end value of each track of an exiting animation (`HoldWithoutCommit`). The group of
/// such an animation gives its callback `true` when each of its tracks reached the end of its timeline. It
/// keeps the held tracks until the owner cancels it, which gives no second result.
class NativeLayoutGroups final : public native_animation::NativeAnimationClient {
 public:
  /// Gets the build ends that a host report causes. UI thread only.
  using BuildEndListener = std::function<void(NativeLayoutBuildEnds)>;

  NativeLayoutGroups(std::shared_ptr<native_animation::NativeAnimationHost> host, BuildEndListener onBuildsEnded);

  /// The request becomes the group of its view. The tracks of the old group that the request does not replace
  /// join it with their keys. Gives the end of the old group, whose callback result is `false`.
  /// `config` is the animation of type `type` that the request plays.
  std::optional<NativeLayoutBuildEnd> start(
      const native_animation::AnimationRequest &request,
      LayoutAnimationType type,
      std::shared_ptr<worklets::Serializable> config);
  /// The tracks of the group of the view that the host plays or holds.
  std::vector<native_animation::TrackKey> members(facebook::react::Tag tag);
  /// False when the host cannot play a track of the group of `view` on that view any more
  /// (`NativeAnimationHost::canRealize`).
  bool canContinueOn(const facebook::react::ShadowView &view);
  /// The layout animation that a frame change of the view starts while its group plays. Null when the view
  /// has no group, or when its group plays an entering or exiting animation: a frame change of the view does
  /// not start such an animation again.
  std::shared_ptr<worklets::Serializable> retargetConfig(facebook::react::Tag tag);
  /// Removes the group of the view. Gives its end, whose callback result is `false` when the callback has no
  /// result yet. In a pull only.
  std::optional<NativeLayoutGroupCancel> cancel(facebook::react::Tag tag);
  /// `cancel` for an owner that can play the animation of the group on the frame driver: the end has
  /// `frameDriverHandover` when the callback has no result yet.
  std::optional<NativeLayoutGroupCancel> cancelForFrameDriver(facebook::react::Tag tag);
  /// Ends all groups and releases all builds. Each callback with no result gets `false`. The host stops the
  /// tracks when the surface closes.
  NativeLayoutBuildEnds clear();

  void onAnimationAdmitted(const native_animation::AnimationHandle &handle) override;
  void onTrackEnded(const native_animation::TrackKey &track, native_animation::TrackEnd end) override;
  void onAnimationEnded(const native_animation::AnimationHandle &handle, native_animation::AnimationResult result)
      override;

 private:
  struct Member {
    native_animation::TrackKey key;
    native_animation::AnimationTrack track;
    /// The track reached the end of its timeline and the host holds its end value on screen.
    bool isHeld{false};
  };

  struct Group {
    uint64_t buildId;
    LayoutAnimationType type;
    std::shared_ptr<worklets::Serializable> config;
    bool hasCallbackResult{false};
    std::vector<Member> members;
    /// The tracks that the command of the group stops at its admission. They play until then.
    std::vector<native_animation::TrackKey> replacedAtAdmission;
  };
  using GroupMap = std::unordered_map<facebook::react::Tag, Group>;

  static Member *memberOf(Group &group, const native_animation::TrackKey &track);
  static std::vector<native_animation::TrackKey> keysOf(const std::vector<Member> &members);
  /// The end that gives the callback of the group its result, or that only releases the build when the
  /// callback has its result. The lock is held.
  NativeLayoutBuildEnd groupEnd(facebook::react::Tag tag, const Group &group, bool callbackResult) const;
  /// Gives the callback of the group `true` when the host plays none of its tracks any more. The group stays
  /// while the host holds one of its tracks. The lock is held.
  std::optional<NativeLayoutBuildEnd> finishIfPlayed(GroupMap::iterator groupIt);
  /// Removes the group. Gives its end and the commands to stop. The lock is held.
  NativeLayoutGroupCancel remove(GroupMap::iterator groupIt);
  /// `remove` whose end has `frameDriverHandover` when the callback of the group has no result yet. The lock
  /// is held.
  NativeLayoutGroupCancel removeForFrameDriver(GroupMap::iterator groupIt);
  /// Ends a group after a host report: no mount follows, so it posts the stop of each command to the host.
  NativeLayoutBuildEnd stop(NativeLayoutGroupCancel removed) const;
  /// The host has one track less of the build. True when it has none left. The lock is held.
  bool releaseTrack(uint64_t buildId);
#ifndef NDEBUG
  /// The trace objective of a command of this client. `hasResult`: the report is the result of the command.
  uint8_t traceObjective(const native_animation::AnimationHandle &handle, bool hasResult);
#endif

  const std::shared_ptr<native_animation::NativeAnimationHost> host_;
  const BuildEndListener onBuildsEnded_;
  std::mutex mutex_;
  GroupMap groups_;
  /// For each build with such tracks, the number of its tracks that the host plays or holds.
  std::unordered_map<uint64_t, size_t> liveTrackCounts_;
#ifndef NDEBUG
  /// The type of the animation of each command with no result yet.
  std::unordered_map<uint64_t, LayoutAnimationType> commandTypes_;
#endif
};

} // namespace reanimated
