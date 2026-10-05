#include <reanimated/LayoutAnimations/NativeLayoutGroups.h>

#include <algorithm>
#include <utility>

namespace reanimated {

using namespace native_animation;

namespace {

NativeLayoutBuildEnd buildRelease(const uint64_t buildId) {
  return {
      .buildId = buildId,
      .callbackResult = std::nullopt,
      .isReleased = true,
      .exitedTag = std::nullopt,
      .frameDriverHandover = std::nullopt};
}

void appendHandles(std::vector<AnimationHandle> &handles, const std::vector<TrackKey> &tracks) {
  for (const auto &track : tracks) {
    if (std::ranges::find(handles, track.handle) == handles.end()) {
      handles.push_back(track.handle);
    }
  }
}

} // namespace

NativeLayoutGroups::NativeLayoutGroups(std::shared_ptr<NativeAnimationHost> host, BuildEndListener onBuildsEnded)
    : host_(std::move(host)), onBuildsEnded_(std::move(onBuildsEnded)) {}

std::optional<NativeLayoutBuildEnd> NativeLayoutGroups::start(
    const AnimationRequest &request,
    const LayoutAnimationType type,
    std::shared_ptr<worklets::Serializable> config) {
  const std::lock_guard<std::mutex> lock(mutex_);
  const auto tag = request.handle.tag;
  Group group{
      .buildId = request.handle.generation,
      .type = type,
      .config = std::move(config),
      .hasCallbackResult = false,
      .members = {},
      .replacedAtAdmission = {}};
  std::optional<NativeLayoutBuildEnd> oldGroupEnd;

  if (const auto oldGroupIt = groups_.find(tag); oldGroupIt != groups_.end()) {
    auto &oldGroup = oldGroupIt->second;
    oldGroupEnd = groupEnd(tag, oldGroup, false);
    group.replacedAtAdmission = std::move(oldGroup.replacedAtAdmission);
    for (const auto &member : oldGroup.members) {
      const auto isReplaced = std::ranges::any_of(request.tracks, [&member](const AnimationTrack &track) {
        return targetsOverlap(track.target, member.key.target);
      });
      if (isReplaced) {
        group.replacedAtAdmission.push_back(member.key);
      } else {
        group.members.push_back(member);
      }
    }
  }

  for (const auto &track : request.tracks) {
    group.members.push_back({.key = {request.handle, track.target}, .track = track, .isHeld = false});
  }
  liveTrackCounts_.insert_or_assign(group.buildId, request.tracks.size());
#ifndef NDEBUG
  commandTypes_.insert_or_assign(group.buildId, type);
#endif
  groups_.insert_or_assign(tag, std::move(group));
  return oldGroupEnd;
}

std::vector<TrackKey> NativeLayoutGroups::members(const Tag tag) {
  const std::lock_guard<std::mutex> lock(mutex_);
  const auto groupIt = groups_.find(tag);
  return groupIt == groups_.end() ? std::vector<TrackKey>{} : keysOf(groupIt->second.members);
}

bool NativeLayoutGroups::canContinueOn(const facebook::react::ShadowView &view) {
  const std::lock_guard<std::mutex> lock(mutex_);
  const auto groupIt = groups_.find(view.tag);
  return groupIt == groups_.end() || std::ranges::all_of(groupIt->second.members, [&](const Member &member) {
           return host_->canRealize(member.track, view);
         });
}

std::shared_ptr<worklets::Serializable> NativeLayoutGroups::retargetConfig(const Tag tag) {
  const std::lock_guard<std::mutex> lock(mutex_);
  const auto groupIt = groups_.find(tag);
  const bool isLayoutGroup = groupIt != groups_.end() && groupIt->second.type == LayoutAnimationType::LAYOUT;
  return isLayoutGroup ? groupIt->second.config : nullptr;
}

std::optional<NativeLayoutBuildEnd> NativeLayoutGroups::cancel(const Tag tag) {
  const std::lock_guard<std::mutex> lock(mutex_);
  const auto groupIt = groups_.find(tag);
  return groupIt == groups_.end() ? std::nullopt : std::optional(fail(groupIt));
}

std::optional<NativeLayoutBuildEnd> NativeLayoutGroups::cancelForFrameDriver(const Tag tag) {
  const std::lock_guard<std::mutex> lock(mutex_);
  const auto groupIt = groups_.find(tag);
  return groupIt == groups_.end() ? std::nullopt : std::optional(failForFrameDriver(groupIt));
}

NativeLayoutBuildEnds NativeLayoutGroups::clear() {
  const std::lock_guard<std::mutex> lock(mutex_);
  NativeLayoutBuildEnds ends;
  for (const auto &[tag, group] : groups_) {
    liveTrackCounts_.erase(group.buildId);
    ends.push_back(groupEnd(tag, group, false));
  }
  groups_.clear();
  for (const auto &[buildId, liveTrackCount] : liveTrackCounts_) {
    ends.push_back(buildRelease(buildId));
  }
  liveTrackCounts_.clear();
  return ends;
}

void NativeLayoutGroups::onAnimationAdmitted(const AnimationHandle &handle) {
#ifndef NDEBUG
  host_->trace().record(
      {.event = TraceEventType::ClientAdmitted, .handle = handle, .objective = traceObjective(handle, false)});
#endif
  const std::lock_guard<std::mutex> lock(mutex_);
  if (const auto groupIt = groups_.find(handle.tag);
      groupIt != groups_.end() && groupIt->second.buildId == handle.generation) {
    groupIt->second.replacedAtAdmission.clear();
  }
}

void NativeLayoutGroups::onTrackEnded(const TrackKey &track, const TrackEnd end) {
  NativeLayoutBuildEnds ends;
  {
    const std::lock_guard<std::mutex> lock(mutex_);
    const auto buildId = track.handle.generation;
    const auto groupIt = groups_.find(track.handle.tag);
    auto *member = groupIt == groups_.end() ? nullptr : memberOf(groupIt->second, track);
    const bool finished = end == TrackEnd::Finished;
    const bool isHeld =
        finished && member != nullptr && member->track.endpointPolicy == EndpointPolicy::HoldWithoutCommit;

    if (isHeld) {
      member->isHeld = true;
    } else {
      const bool hasOpenCallback = groupIt != groups_.end() && groupIt->second.buildId == buildId;
      if (releaseTrack(buildId) && !hasOpenCallback) {
        ends.push_back(buildRelease(buildId));
      }
    }
    if (member != nullptr && !finished) {
      // The frame driver can play an animation on a view that left its window.
      ends.push_back(end == TrackEnd::PlatformRemoved ? failForFrameDriver(groupIt) : fail(groupIt));
    } else if (member != nullptr) {
      if (!isHeld) {
        std::erase_if(groupIt->second.members, [&track](const Member &each) { return each.key == track; });
      }
      if (const auto end = finishIfPlayed(groupIt)) {
        ends.push_back(*end);
      }
    }
  }
  if (!ends.empty()) {
    onBuildsEnded_(std::move(ends));
  }
}

void NativeLayoutGroups::onAnimationEnded(const AnimationHandle &handle, const AnimationResult result) {
#ifndef NDEBUG
  host_->trace().record(
      {.event = TraceEventType::ClientEnded,
       .handle = handle,
       .objective = traceObjective(handle, true),
       .result = result});
#endif
  // The track reports give every other result of an admitted command.
  if (result.outcome != AnimationOutcome::Rejected && result.outcome != AnimationOutcome::SurfaceDestroyed) {
    return;
  }
  NativeLayoutBuildEnds ends;
  {
    const std::lock_guard<std::mutex> lock(mutex_);
    // No track of a command without admission started, so no track report comes.
    if (liveTrackCounts_.erase(handle.generation) == 0) {
      return;
    }
    const auto groupIt = groups_.find(handle.tag);
    const auto needsCommand = [&handle](const Group &group) {
      return std::ranges::any_of(
          group.members, [&handle](const Member &member) { return member.key.handle == handle; });
    };
    const bool hasOpenCallback = groupIt != groups_.end() && groupIt->second.buildId == handle.generation;
    if (!hasOpenCallback) {
      ends.push_back(buildRelease(handle.generation));
    }
    if (groupIt != groups_.end() && needsCommand(groupIt->second)) {
      ends.push_back(fail(groupIt));
    }
  }
  if (!ends.empty()) {
    onBuildsEnded_(std::move(ends));
  }
}

NativeLayoutGroups::Member *NativeLayoutGroups::memberOf(Group &group, const TrackKey &track) {
  const auto memberIt = std::ranges::find(group.members, track, &Member::key);
  return memberIt == group.members.end() ? nullptr : &*memberIt;
}

std::vector<TrackKey> NativeLayoutGroups::keysOf(const std::vector<Member> &members) {
  std::vector<TrackKey> keys;
  keys.reserve(members.size());
  for (const auto &member : members) {
    keys.push_back(member.key);
  }
  return keys;
}

NativeLayoutBuildEnd NativeLayoutGroups::groupEnd(const Tag tag, const Group &group, const bool callbackResult) const {
  const bool isReleased = !liveTrackCounts_.contains(group.buildId);
  if (group.hasCallbackResult) {
    return {
        .buildId = group.buildId,
        .callbackResult = std::nullopt,
        .isReleased = isReleased,
        .exitedTag = std::nullopt,
        .frameDriverHandover = std::nullopt};
  }
  return {
      .buildId = group.buildId,
      .callbackResult = callbackResult,
      .isReleased = isReleased,
      .exitedTag = group.type == LayoutAnimationType::EXITING ? std::optional(tag) : std::nullopt,
      .frameDriverHandover = std::nullopt};
}

std::optional<NativeLayoutBuildEnd> NativeLayoutGroups::finishIfPlayed(const GroupMap::iterator groupIt) {
  auto &group = groupIt->second;
  if (group.hasCallbackResult || !std::ranges::all_of(group.members, &Member::isHeld)) {
    return std::nullopt;
  }
  auto end = groupEnd(groupIt->first, group, true);
  if (group.members.empty()) {
    groups_.erase(groupIt);
  } else {
    group.hasCallbackResult = true;
  }
  return end;
}

NativeLayoutBuildEnd NativeLayoutGroups::fail(const GroupMap::iterator groupIt) {
  const auto tag = groupIt->first;
  const auto group = std::move(groupIt->second);
  groups_.erase(groupIt);

  std::vector<AnimationHandle> handles;
  appendHandles(handles, keysOf(group.members));
  appendHandles(handles, group.replacedAtAdmission);
  for (const auto &handle : handles) {
    host_->cancel(handle, TrackStopMode::SettleToModel);
  }
  // The host reports the end of a track one time, so the stop of a held track gives no report.
  for (const auto &member : group.members) {
    if (member.isHeld) {
      releaseTrack(member.key.handle.generation);
    }
  }
  return groupEnd(tag, group, false);
}

NativeLayoutBuildEnd NativeLayoutGroups::failForFrameDriver(const GroupMap::iterator groupIt) {
  const auto &group = groupIt->second;
  if (group.hasCallbackResult) {
    return fail(groupIt);
  }
  FrameDriverHandover handover{.tag = groupIt->first, .type = group.type, .config = group.config, .joinedTracks = {}};
  for (const auto &member : group.members) {
    if (member.key.handle.generation != group.buildId) {
      handover.joinedTracks.push_back(member.key);
    }
  }
  auto end = fail(groupIt);
  end.frameDriverHandover = std::move(handover);
  return end;
}

#ifndef NDEBUG
uint8_t NativeLayoutGroups::traceObjective(const AnimationHandle &handle, const bool hasResult) {
  const std::lock_guard<std::mutex> lock(mutex_);
  const auto objective = traceObjectiveOf(commandTypes_.at(handle.generation));
  if (hasResult) {
    commandTypes_.erase(handle.generation);
  }
  return objective;
}
#endif

bool NativeLayoutGroups::releaseTrack(const uint64_t buildId) {
  const auto countIt = liveTrackCounts_.find(buildId);
  if (countIt == liveTrackCounts_.end() || --countIt->second > 0) {
    return false;
  }
  liveTrackCounts_.erase(countIt);
  return true;
}

} // namespace reanimated
