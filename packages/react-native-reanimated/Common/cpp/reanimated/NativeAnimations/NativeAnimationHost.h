#pragma once

#include <reanimated/NativeAnimations/NativeAnimationPlatform.h>
#include <reanimated/NativeAnimations/NativeAnimationTrace.h>

#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <variant>
#include <vector>

namespace reanimated::native_animation {

/// A start whose view has its final state on the host view.
struct MountedStart {
  AnimationRequest request;
  std::weak_ptr<NativeAnimationClient> client;
};

/// A stop of a command in a mount report. The view shows its model value again
/// (`TrackStopMode::SettleToModel`), because the mount gave the model its value.
struct MountedStop {
  AnimationHandle handle;
};

using MountedOperation = std::variant<MountedStart, MountedStop>;

/// The shared playback boundary. It owns the records of active commands and tracks, resolves target
/// conflicts, and reports results. Any thread can call it; each operation but those of `runAfterMount` runs
/// later on the platform UI thread in call order, with no lock of the caller held.
class NativeAnimationHost final : public std::enable_shared_from_this<NativeAnimationHost> {
 public:
  static std::shared_ptr<NativeAnimationHost> create(std::shared_ptr<NativeAnimationPlatform> platform);

  void start(AnimationRequest request, std::weak_ptr<NativeAnimationClient> client);
  /// UI thread only, in the platform report of a mount of the surface of the operations. Runs each operation
  /// before it returns, in order, so the mounted state, each stop, and each playback reach the screen
  /// together. It does not wait for the queued operations and reads no surface state. The clients get their
  /// reports later, before the reports of the queued operations.
  void runAfterMount(const std::vector<MountedOperation> &operations);
  /// The static answer of the platform (`NativeAnimationPlatform::canRealize`). Any thread.
  bool canRealize(const AnimationTrack &track, const facebook::react::ShadowView &view) const;
  /// True when the mounted view of the tag is in a window. UI thread only.
  bool isMountedInWindow(Tag tag) const;
  /// Stops every track that the command still owns, also after its result. Reports Cancelled when the
  /// command had no result.
  void cancel(const AnimationHandle &handle, TrackStopMode mode);
  /// Stops all work of the surface. Commands without a result report SurfaceDestroyed.
  void closeSurface(SurfaceId surfaceId);

#ifndef NDEBUG
  void takeTrace(std::function<void(std::vector<TraceEvent>)> receiver);
  /// UI thread only.
  TraceRecorder &trace();
  void sampleTarget(Tag tag, AnimationTarget target, std::function<void(std::optional<TargetSample>)> receiver);
#endif

 private:
  struct Track {
    AnimationTarget target;
    EndpointPolicy endpointPolicy;
    /// A held track stays active after it reports its end.
    bool hasReportedEnd{false};
  };

  struct Command {
    std::weak_ptr<NativeAnimationClient> client;
    std::vector<Track> tracks;
    bool hasResult{false};
  };

  using Operation = std::function<void()>;
  using Deliveries = std::vector<std::function<void()>>;
  using CommandMap = std::unordered_map<AnimationHandle, Command, AnimationHandleHash>;

  explicit NativeAnimationHost(std::shared_ptr<NativeAnimationPlatform> platform);

  void enqueue(Operation operation);
  void post(std::deque<Operation> &queue, Operation operation);
  void drain();

  void runStart(const AnimationRequest &request, const std::weak_ptr<NativeAnimationClient> &client);
  void
  admit(const AnimationRequest &request, const std::weak_ptr<NativeAnimationClient> &client, Deliveries &deliveries);
  void runCancel(const AnimationHandle &handle, TrackStopMode mode);
  void runCloseSurface(SurfaceId surfaceId);
  void onPlatformTrackEnded(const TrackKey &key, bool finished);
  void endTrack(const TrackKey &key, TrackEnd end, Deliveries &deliveries);

  std::optional<AnimationResultReason> validate(const AnimationRequest &request) const;
  std::vector<TrackKey> conflictingTracks(const AnimationRequest &request) const;
  void endWithoutAdmission(
      const AnimationHandle &handle,
      const std::weak_ptr<NativeAnimationClient> &client,
      AnimationResult result,
      Deliveries &deliveries);
  void releaseReplacedTracks(const std::vector<TrackKey> &replacedTracks, Deliveries &deliveries);
  void
  stopCommand(CommandMap::iterator commandIt, TrackStopMode mode, AnimationOutcome outcome, Deliveries &deliveries);
  void endCommand(const AnimationHandle &handle, Command &command, AnimationResult result, Deliveries &deliveries);
  void reportTrackEnd(
      const std::weak_ptr<NativeAnimationClient> &client,
      Track &track,
      const TrackKey &key,
      TrackEnd end,
      Deliveries &deliveries);

  const std::shared_ptr<NativeAnimationPlatform> platform_;

  std::mutex queueMutex_;
  std::deque<Operation> queue_;
  /// The client reports of `runAfterMount`, in the order of its operations. They run before `queue_`.
  std::deque<Operation> mountReports_;

  CommandMap commands_;
#ifndef NDEBUG
  TraceRecorder trace_;
#endif
};

} // namespace reanimated::native_animation
