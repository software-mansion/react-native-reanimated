#include <reanimated/NativeAnimations/NativeAnimationHost.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <algorithm>
#include <utility>

#ifndef NDEBUG
#define RECORD_TRACE(...) trace_.record(TraceEvent{__VA_ARGS__})
#else
#define RECORD_TRACE(...) ((void)0)
#endif

namespace reanimated::native_animation {

namespace {

bool isSameView(const AnimationHandle &lhs, const AnimationHandle &rhs) {
  return lhs.surfaceId == rhs.surfaceId && lhs.tag == rhs.tag;
}

bool hasPriorityOver(const AnimationOwner incoming, const AnimationOwner active) {
  return incoming == AnimationOwner::Layout || active != AnimationOwner::Layout;
}

bool overlapsAny(const AnimationTarget target, const std::vector<AnimationTrack> &tracks) {
  return std::ranges::any_of(
      tracks, [target](const AnimationTrack &track) { return targetsOverlap(track.target, target); });
}

} // namespace

std::shared_ptr<NativeAnimationHost> NativeAnimationHost::create(std::shared_ptr<NativeAnimationPlatform> platform) {
  auto host = std::shared_ptr<NativeAnimationHost>(new NativeAnimationHost(std::move(platform)));
  host->platform_->setTrackEndListener([weakHost = host->weak_from_this()](const TrackKey &key, const bool finished) {
    if (const auto strongHost = weakHost.lock()) {
      strongHost->enqueue([weakHost, key, finished] {
        if (const auto strongHost = weakHost.lock()) {
          strongHost->onPlatformTrackEnded(key, finished);
        }
      });
    }
  });
  return host;
}

NativeAnimationHost::NativeAnimationHost(std::shared_ptr<NativeAnimationPlatform> platform)
    : platform_(std::move(platform)) {}

void NativeAnimationHost::start(AnimationRequest request, std::weak_ptr<NativeAnimationClient> client) {
  enqueue([weakThis = weak_from_this(), request = std::move(request), client = std::move(client)] {
    if (const auto strongThis = weakThis.lock()) {
      strongThis->runStart(request, client);
    }
  });
}

void NativeAnimationHost::runAfterMount(const std::vector<MountedOperation> &operations) {
  ReanimatedSystraceSection section("NativeAnimationHost::runAfterMount");
  Deliveries deliveries;
  for (const auto &operation : operations) {
    if (const auto *start = std::get_if<MountedStart>(&operation)) {
      RECORD_TRACE(.event = TraceEventType::Received, .handle = start->request.handle);
      admit(start->request, start->client, deliveries);
      continue;
    }
    const auto commandIt = commands_.find(std::get<MountedStop>(operation).handle);
    if (commandIt != commands_.end()) {
      stopCommand(commandIt, TrackStopMode::SettleToModel, AnimationOutcome::Cancelled, deliveries);
    }
  }
  post(mountReports_, [deliveries = std::move(deliveries)] {
    for (const auto &delivery : deliveries) {
      delivery();
    }
  });
}

void NativeAnimationHost::cancel(const AnimationHandle &handle, const TrackStopMode mode) {
  enqueue([weakThis = weak_from_this(), handle, mode] {
    if (const auto strongThis = weakThis.lock()) {
      strongThis->runCancel(handle, mode);
    }
  });
}

void NativeAnimationHost::closeSurface(const SurfaceId surfaceId) {
  enqueue([weakThis = weak_from_this(), surfaceId] {
    if (const auto strongThis = weakThis.lock()) {
      strongThis->runCloseSurface(surfaceId);
    }
  });
}

bool NativeAnimationHost::canRealize(const AnimationTrack &track, const facebook::react::ShadowView &view) const {
  return platform_->canRealize(track, view);
}

bool NativeAnimationHost::isMountedInWindow(const Tag tag) const {
  return platform_->isInWindow(tag);
}

#ifndef NDEBUG
void NativeAnimationHost::takeTrace(std::function<void(std::vector<TraceEvent>)> receiver) {
  enqueue([weakThis = weak_from_this(), receiver = std::move(receiver)] {
    if (const auto strongThis = weakThis.lock()) {
      receiver(strongThis->trace_.take());
    }
  });
}

TraceRecorder &NativeAnimationHost::trace() {
  return trace_;
}

void NativeAnimationHost::sampleTarget(
    const Tag tag,
    const AnimationTarget target,
    std::function<void(std::optional<TargetSample>)> receiver) {
  enqueue([weakThis = weak_from_this(), tag, target, receiver = std::move(receiver)] {
    if (const auto strongThis = weakThis.lock()) {
      auto sample = strongThis->platform_->sample(tag, target);
      if (sample) {
        sample->monotonicTimeMs = TraceRecorder::now();
      }
      receiver(std::move(sample));
    }
  });
}
#endif

void NativeAnimationHost::enqueue(Operation operation) {
  post(queue_, std::move(operation));
}

void NativeAnimationHost::post(std::deque<Operation> &queue, Operation operation) {
  {
    const std::lock_guard lock(queueMutex_);
    const bool hasPendingDrain = !queue_.empty() || !mountReports_.empty();
    queue.push_back(std::move(operation));
    if (hasPendingDrain) {
      return;
    }
  }
  platform_->postToUIThread([weakThis = weak_from_this()] {
    if (const auto strongThis = weakThis.lock()) {
      strongThis->drain();
    }
  });
}

void NativeAnimationHost::drain() {
  while (true) {
    Operation operation;
    {
      const std::lock_guard lock(queueMutex_);
      auto &queue = mountReports_.empty() ? queue_ : mountReports_;
      if (queue.empty()) {
        break;
      }
      operation = std::move(queue.front());
      queue.pop_front();
    }
    operation();
  }
}

void NativeAnimationHost::runStart(
    const AnimationRequest &request,
    const std::weak_ptr<NativeAnimationClient> &client) {
  ReanimatedSystraceSection section("NativeAnimationHost::start");
  const auto &handle = request.handle;
  RECORD_TRACE(.event = TraceEventType::Received, .handle = handle);

  Deliveries deliveries;
  if (platform_->isSurfaceRunning(handle.surfaceId)) {
    admit(request, client, deliveries);
  } else {
    endWithoutAdmission(handle, client, {AnimationOutcome::SurfaceDestroyed}, deliveries);
  }
  for (const auto &delivery : deliveries) {
    delivery();
  }
}

void NativeAnimationHost::admit(
    const AnimationRequest &request,
    const std::weak_ptr<NativeAnimationClient> &client,
    Deliveries &deliveries) {
  const auto &handle = request.handle;
  if (commands_.contains(handle)) {
    endWithoutAdmission(handle, client, {AnimationOutcome::Rejected, AnimationResultReason::StaleIdentity}, deliveries);
    return;
  }
  if (const auto reason = validate(request)) {
    endWithoutAdmission(handle, client, {AnimationOutcome::Rejected, *reason}, deliveries);
    return;
  }

  auto resolution = platform_->resolve(request);
  if (const auto *reason = std::get_if<AnimationResultReason>(&resolution)) {
    endWithoutAdmission(handle, client, {AnimationOutcome::Rejected, *reason}, deliveries);
    return;
  }
  const auto &mountedAnimation = std::get<std::unique_ptr<MountedAnimation>>(resolution);

  const auto replacedTracks = conflictingTracks(request);
  const auto losesToActiveOwner = [&handle](const TrackKey &active) {
    return !hasPriorityOver(handle.owner, active.handle.owner);
  };
  if (std::ranges::any_of(replacedTracks, losesToActiveOwner)) {
    endWithoutAdmission(
        handle, client, {AnimationOutcome::Rejected, AnimationResultReason::OwnershipDenied}, deliveries);
    return;
  }

  std::vector<AnimationTarget> interruptedTargets;
  for (const auto &track : request.tracks) {
    const auto replaces = [&track](const TrackKey &replaced) {
      return targetsOverlap(track.target, replaced.target);
    };
    if (std::ranges::any_of(replacedTracks, replaces)) {
      interruptedTargets.push_back(track.target);
    }
  }
  if (const auto reason = mountedAnimation->prepare(interruptedTargets)) {
    endWithoutAdmission(handle, client, {AnimationOutcome::Rejected, *reason}, deliveries);
    return;
  }

  releaseReplacedTracks(replacedTracks, deliveries);

  Command command{client, {}};
  command.tracks.reserve(request.tracks.size());
  for (const auto &track : request.tracks) {
    command.tracks.push_back({track.target, track.endpointPolicy});
    RECORD_TRACE(
            .event = TraceEventType::TrackStarted,
            .handle = handle,
            .target = track.target,
            .endpointPolicy = track.endpointPolicy);
  }
  commands_.emplace(handle, std::move(command));
  mountedAnimation->start(replacedTracks);
  RECORD_TRACE(.event = TraceEventType::Admitted, .handle = handle);

  deliveries.emplace_back([client, handle] {
    if (const auto strongClient = client.lock()) {
      strongClient->onAnimationAdmitted(handle);
    }
  });
  for (const auto &track : request.tracks) {
    if (playbackOf(track) == TrackPlayback::Immediate) {
      endTrack({handle, track.target}, TrackEnd::Finished, deliveries);
    }
  }
}

void NativeAnimationHost::runCancel(const AnimationHandle &handle, const TrackStopMode mode) {
  const auto commandIt = commands_.find(handle);
  if (commandIt == commands_.end()) {
    return;
  }
  Deliveries deliveries;
  stopCommand(commandIt, mode, AnimationOutcome::Cancelled, deliveries);
  for (const auto &delivery : deliveries) {
    delivery();
  }
}

void NativeAnimationHost::runCloseSurface(const SurfaceId surfaceId) {
  RECORD_TRACE(.event = TraceEventType::SurfaceClosed, .handle = {.surfaceId = surfaceId});
  std::vector<AnimationHandle> handles;
  for (const auto &[handle, command] : commands_) {
    if (handle.surfaceId == surfaceId) {
      handles.push_back(handle);
    }
  }
  for (const auto &handle : handles) {
    Deliveries deliveries;
    stopCommand(commands_.find(handle), TrackStopMode::SettleToModel, AnimationOutcome::SurfaceDestroyed, deliveries);
    for (const auto &delivery : deliveries) {
      delivery();
    }
  }
}

void NativeAnimationHost::onPlatformTrackEnded(const TrackKey &key, const bool finished) {
  Deliveries deliveries;
  endTrack(key, finished ? TrackEnd::Finished : TrackEnd::PlatformRemoved, deliveries);
  for (const auto &delivery : deliveries) {
    delivery();
  }
}

void NativeAnimationHost::endTrack(const TrackKey &key, const TrackEnd end, Deliveries &deliveries) {
  const auto commandIt = commands_.find(key.handle);
  if (commandIt == commands_.end()) {
    return;
  }
  auto &command = commandIt->second;
  const auto trackIt = std::ranges::find(command.tracks, key.target, &Track::target);
  if (trackIt == command.tracks.end()) {
    return;
  }

  const bool finished = end == TrackEnd::Finished;
  reportTrackEnd(command.client, *trackIt, key, end, deliveries);
  const bool isHeld = finished && trackIt->endpointPolicy == EndpointPolicy::HoldWithoutCommit;
  if (isHeld) {
    return;
  }
  command.tracks.erase(trackIt);
  if (!command.tracks.empty()) {
    return;
  }
  if (!command.hasResult) {
    const auto result = finished
        ? AnimationResult{AnimationOutcome::Finished}
        : AnimationResult{AnimationOutcome::Interrupted, AnimationResultReason::PlatformRemoved};
    endCommand(key.handle, command, result, deliveries);
  }
  commands_.erase(commandIt);
}

std::optional<AnimationResultReason> NativeAnimationHost::validate(const AnimationRequest &request) const {
  if (request.tracks.empty()) {
    return AnimationResultReason::InvalidPlan;
  }
  for (auto trackIt = request.tracks.begin(); trackIt != request.tracks.end(); ++trackIt) {
    const auto overlapsEarlier = [trackIt](const AnimationTrack &earlier) {
      return targetsOverlap(earlier.target, trackIt->target);
    };
    if (validateTrack(*trackIt) || std::any_of(request.tracks.begin(), trackIt, overlapsEarlier)) {
      return AnimationResultReason::InvalidPlan;
    }
  }
  return std::nullopt;
}

std::vector<TrackKey> NativeAnimationHost::conflictingTracks(const AnimationRequest &request) const {
  std::vector<TrackKey> conflicts;
  for (const auto &[handle, command] : commands_) {
    if (!isSameView(handle, request.handle)) {
      continue;
    }
    for (const auto &track : command.tracks) {
      if (overlapsAny(track.target, request.tracks)) {
        conflicts.push_back({handle, track.target});
      }
    }
  }
  return conflicts;
}

void NativeAnimationHost::endWithoutAdmission(
    const AnimationHandle &handle,
    const std::weak_ptr<NativeAnimationClient> &client,
    const AnimationResult result,
    Deliveries &deliveries) {
  RECORD_TRACE(.event = TraceEventType::Ended, .handle = handle, .result = result);
  deliveries.emplace_back([client, handle, result] {
    if (const auto strongClient = client.lock()) {
      strongClient->onAnimationEnded(handle, result);
    }
  });
}

void NativeAnimationHost::releaseReplacedTracks(const std::vector<TrackKey> &replacedTracks, Deliveries &deliveries) {
  for (const auto &key : replacedTracks) {
    const auto commandIt = commands_.find(key.handle);
    auto &command = commandIt->second;
    const auto trackIt = std::ranges::find(command.tracks, key.target, &Track::target);
    reportTrackEnd(command.client, *trackIt, key, TrackEnd::Stopped, deliveries);
    command.tracks.erase(trackIt);
    if (!command.hasResult) {
      endCommand(key.handle, command, {AnimationOutcome::Interrupted}, deliveries);
    }
    if (command.tracks.empty()) {
      commands_.erase(commandIt);
    }
  }
}

void NativeAnimationHost::stopCommand(
    const CommandMap::iterator commandIt,
    const TrackStopMode mode,
    const AnimationOutcome outcome,
    Deliveries &deliveries) {
  const auto handle = commandIt->first;
  auto command = std::move(commandIt->second);
  commands_.erase(commandIt);

  for (auto &track : command.tracks) {
    const TrackKey key{handle, track.target};
    platform_->stop(key, mode);
    reportTrackEnd(command.client, track, key, TrackEnd::Stopped, deliveries);
  }
  if (!command.hasResult) {
    endCommand(handle, command, {outcome}, deliveries);
  }
}

void NativeAnimationHost::endCommand(
    const AnimationHandle &handle,
    Command &command,
    const AnimationResult result,
    Deliveries &deliveries) {
  command.hasResult = true;
  RECORD_TRACE(.event = TraceEventType::Ended, .handle = handle, .result = result);
  deliveries.emplace_back([client = command.client, handle, result] {
    if (const auto strongClient = client.lock()) {
      strongClient->onAnimationEnded(handle, result);
    }
  });
}

void NativeAnimationHost::reportTrackEnd(
    const std::weak_ptr<NativeAnimationClient> &client,
    Track &track,
    const TrackKey &key,
    const TrackEnd end,
    Deliveries &deliveries) {
  if (std::exchange(track.hasReportedEnd, true)) {
    return;
  }
  RECORD_TRACE(
          .event = TraceEventType::TrackEnded,
          .handle = key.handle,
          .target = key.target,
          .finished = end == TrackEnd::Finished);
  deliveries.emplace_back([client, key, end] {
    if (const auto strongClient = client.lock()) {
      strongClient->onTrackEnded(key, end);
    }
  });
}

} // namespace reanimated::native_animation
