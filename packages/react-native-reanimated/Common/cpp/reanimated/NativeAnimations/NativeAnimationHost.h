#pragma once

#include <reanimated/NativeAnimations/NativeAnimationPlatform.h>
#include <reanimated/NativeAnimations/NativeAnimationTrace.h>

#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <vector>

namespace reanimated::native_animation {

/// The shared playback boundary. It owns the records of active commands and tracks, resolves target
/// conflicts, and reports results. Any thread can call it; each operation runs later on the platform UI
/// thread in call order, with no lock of the caller held.
class NativeAnimationHost final : public std::enable_shared_from_this<NativeAnimationHost> {
 public:
  static std::shared_ptr<NativeAnimationHost> create(std::shared_ptr<NativeAnimationPlatform> platform);

  void start(AnimationRequest request, std::weak_ptr<NativeAnimationClient> client);
  /// Stops every track that the command still owns, also after its result. Reports Cancelled when the
  /// command had no result.
  void cancel(const AnimationHandle &handle, TrackStopMode mode);
  /// Stops all work of the surface. Commands without a result report SurfaceDestroyed.
  void closeSurface(SurfaceId surfaceId);

#ifndef NDEBUG
  void takeTrace(std::function<void(std::vector<TraceEvent>)> receiver);
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
  void drain();

  void runStart(const AnimationRequest &request, const std::weak_ptr<NativeAnimationClient> &client);
  void runCancel(const AnimationHandle &handle, TrackStopMode mode);
  void runCloseSurface(SurfaceId surfaceId);
  void onTrackEnded(const TrackKey &key, bool finished);

  std::optional<AnimationResultReason> validate(const AnimationRequest &request) const;
  std::vector<TrackKey> conflictingTracks(const AnimationRequest &request) const;
  void endWithoutAdmission(
      const AnimationHandle &handle,
      const std::weak_ptr<NativeAnimationClient> &client,
      AnimationResult result);
  void releaseReplacedTracks(const std::vector<TrackKey> &replacedTracks, Deliveries &deliveries);
  void stopCommand(CommandMap::iterator commandIt, TrackStopMode mode, AnimationOutcome outcome);
  void endCommand(const AnimationHandle &handle, Command &command, AnimationResult result, Deliveries &deliveries);
  void reportTrackEnd(
      const std::weak_ptr<NativeAnimationClient> &client,
      Track &track,
      const TrackKey &key,
      bool finished,
      Deliveries &deliveries);

  const std::shared_ptr<NativeAnimationPlatform> platform_;

  std::mutex queueMutex_;
  std::deque<Operation> queue_;

  CommandMap commands_;
#ifndef NDEBUG
  TraceRecorder trace_;
#endif
};

} // namespace reanimated::native_animation
