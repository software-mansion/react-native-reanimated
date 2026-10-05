#include <reanimated/LayoutAnimations/NativeLayoutGroups.h>

#include <algorithm>
#include <utility>

namespace reanimated {

using namespace native_animation;

namespace {

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
    std::shared_ptr<worklets::Serializable> retargetConfig) {
  const std::lock_guard<std::mutex> lock(mutex_);
  Group group{
      .buildId = request.handle.generation,
      .retargetConfig = std::move(retargetConfig),
      .members = {},
      .replacedAtAdmission = {}};
  std::optional<NativeLayoutBuildEnd> oldGroupEnd;

  if (const auto oldGroupIt = groups_.find(request.handle.tag); oldGroupIt != groups_.end()) {
    auto &oldGroup = oldGroupIt->second;
    oldGroupEnd = groupEnd(oldGroup.buildId, false);
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
    group.members.push_back({{request.handle, track.target}, track});
  }
  liveTrackCounts_.insert_or_assign(group.buildId, request.tracks.size());
  groups_.insert_or_assign(request.handle.tag, std::move(group));
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
  return groupIt == groups_.end() ? nullptr : groupIt->second.retargetConfig;
}

std::optional<NativeLayoutBuildEnd> NativeLayoutGroups::cancel(const Tag tag) {
  const std::lock_guard<std::mutex> lock(mutex_);
  const auto groupIt = groups_.find(tag);
  return groupIt == groups_.end() ? std::nullopt : std::optional(fail(groupIt));
}

NativeLayoutBuildEnds NativeLayoutGroups::clear() {
  const std::lock_guard<std::mutex> lock(mutex_);
  NativeLayoutBuildEnds ends;
  for (const auto &[tag, group] : groups_) {
    liveTrackCounts_.erase(group.buildId);
    ends.push_back(groupEnd(group.buildId, false));
  }
  groups_.clear();
  for (const auto &[buildId, liveTrackCount] : liveTrackCounts_) {
    ends.push_back({buildId, std::nullopt, true});
  }
  liveTrackCounts_.clear();
  return ends;
}

void NativeLayoutGroups::onAnimationAdmitted(const AnimationHandle &handle) {
#ifndef NDEBUG
  host_->trace().record({.event = TraceEventType::ClientAdmitted, .handle = handle, .objective = 7});
#endif
  const std::lock_guard<std::mutex> lock(mutex_);
  if (const auto groupIt = groups_.find(handle.tag);
      groupIt != groups_.end() && groupIt->second.buildId == handle.generation) {
    groupIt->second.replacedAtAdmission.clear();
  }
}

void NativeLayoutGroups::onTrackEnded(const TrackKey &track, const bool finished) {
  NativeLayoutBuildEnds ends;
  {
    const std::lock_guard<std::mutex> lock(mutex_);
    const auto buildId = track.handle.generation;
    const auto countIt = liveTrackCounts_.find(buildId);
    const bool hasNoLiveTrack = countIt != liveTrackCounts_.end() && --countIt->second == 0;
    if (hasNoLiveTrack) {
      liveTrackCounts_.erase(countIt);
    }

    const auto groupIt = groups_.find(track.handle.tag);
    const bool hasOpenCallback = groupIt != groups_.end() && groupIt->second.buildId == buildId;
    if (hasNoLiveTrack && !hasOpenCallback) {
      ends.push_back({buildId, std::nullopt, true});
    }
    if (groupIt != groups_.end()) {
      auto &group = groupIt->second;
      if (const auto memberIt = std::ranges::find(group.members, track, &Member::key);
          memberIt != group.members.end()) {
        if (!finished) {
          ends.push_back(fail(groupIt));
        } else if (group.members.size() == 1) {
          ends.push_back(groupEnd(group.buildId, true));
          groups_.erase(groupIt);
        } else {
          group.members.erase(memberIt);
        }
      }
    }
  }
  if (!ends.empty()) {
    onBuildsEnded_(std::move(ends));
  }
}

void NativeLayoutGroups::onAnimationEnded(const AnimationHandle &handle, const AnimationResult result) {
#ifndef NDEBUG
  host_->trace().record({.event = TraceEventType::ClientEnded, .handle = handle, .objective = 7, .result = result});
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
      ends.push_back({handle.generation, std::nullopt, true});
    }
    if (groupIt != groups_.end() && needsCommand(groupIt->second)) {
      ends.push_back(fail(groupIt));
    }
  }
  if (!ends.empty()) {
    onBuildsEnded_(std::move(ends));
  }
}

std::vector<TrackKey> NativeLayoutGroups::keysOf(const std::vector<Member> &members) {
  std::vector<TrackKey> keys;
  keys.reserve(members.size());
  for (const auto &member : members) {
    keys.push_back(member.key);
  }
  return keys;
}

NativeLayoutBuildEnd NativeLayoutGroups::groupEnd(const uint64_t buildId, const bool callbackResult) const {
  return {buildId, callbackResult, !liveTrackCounts_.contains(buildId)};
}

NativeLayoutBuildEnd NativeLayoutGroups::fail(const GroupMap::iterator groupIt) {
  const auto group = std::move(groupIt->second);
  groups_.erase(groupIt);

  std::vector<AnimationHandle> handles;
  appendHandles(handles, keysOf(group.members));
  appendHandles(handles, group.replacedAtAdmission);
  for (const auto &handle : handles) {
    host_->cancel(handle, TrackStopMode::SettleToModel);
  }
  return groupEnd(group.buildId, false);
}

} // namespace reanimated
