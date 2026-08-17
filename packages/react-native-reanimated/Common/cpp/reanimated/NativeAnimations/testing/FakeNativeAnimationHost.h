#pragma once

#include <reanimated/NativeAnimations/NativeAnimationHost.h>
#include <reanimated/NativeAnimations/NativeAnimationInterfaces.h>

#include <algorithm>
#include <cstdint>
#include <deque>
#include <functional>
#include <optional>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <variant>
#include <vector>

namespace reanimated::native_animation::testing {

class TestPlatformUIScheduler final : public PlatformUIScheduler {
 public:
  void schedule(PlatformUIOperation operation) override {
    operations_.push_back(std::move(operation));
  }

  void flush() {
    while (!operations_.empty()) {
      auto operation = std::move(operations_.front());
      operations_.pop_front();
      operation();
    }
  }

 private:
  std::deque<PlatformUIOperation> operations_;
};

class TestResolvedAnimationTarget final : public ResolvedAnimationTarget {};

class TestNativeAnimationTargetResolver final : public NativeAnimationTargetResolver {
 public:
  TargetBatchResolution resolveTargets(const AnimationHandle &, const std::vector<AnimationTarget> &targets) override {
    ++resolveCallCount;
    ResolvedAnimationTargets resolvedTargets;
    resolvedTargets.reserve(targets.size());
    for (const auto target : targets) {
      if (rejectedTargets.contains(target.kind)) {
        return AnimationResultReason::UnsupportedTargetRealization;
      }
      resolvedTargets.push_back(std::make_unique<TestResolvedAnimationTarget>());
    }
    resolvedTargetCount += targets.size();
    return resolvedTargets;
  }

  std::unordered_set<AnimationTargetKind> rejectedTargets;
  size_t resolveCallCount{0};
  size_t resolvedTargetCount{0};
};

class TestPreparedNativeAnimation final : public PreparedNativeAnimation {
 public:
  explicit TestPreparedNativeAnimation(std::vector<AnimationTrack> tracks) : tracks(std::move(tracks)) {}

  std::vector<AnimationTrack> tracks;
};

class TestNativeAnimationExecutor : public NativeAnimationExecutor {
 public:
  NativeAnimationPreparation prepare(const AnimationHandle &, std::vector<ResolvedAnimationTrack> tracks) override {
    if (preparationFailure) {
      return *preparationFailure;
    }
    std::vector<AnimationTrack> preparedTracks;
    for (auto &track : tracks) {
      preparedTracks.push_back(std::move(track.track));
    }
    return std::make_unique<TestPreparedNativeAnimation>(std::move(preparedTracks));
  }

  void start(
      const AnimationHandle &handle,
      std::unique_ptr<PreparedNativeAnimation> prepared,
      const std::vector<NativeTrackInterruption> &interruptions,
      NativeTrackTerminalCallback terminal) override {
    if (onStart) {
      onStart(handle);
    }
    for (const auto &interruption : interruptions) {
      interrupted.push_back(interruption);
      const auto activeIt = active.find(interruption.handle);
      if (activeIt != active.end()) {
        std::erase(activeIt->second.targets, interruption.target);
        if (activeIt->second.targets.empty()) {
          active.erase(activeIt);
        }
      }
    }
    const auto &testPrepared = static_cast<const TestPreparedNativeAnimation &>(*prepared);
    started.push_back(handle);
    std::vector<AnimationTarget> activeTargets;
    for (const auto &track : testPrepared.tracks) {
      if (track.durationMs == 0) {
        // A real executor waits for the declared delay first. This fake
        // records the delay and completes at once.
        zeroDuration.push_back({handle, track.target, track.delayMs});
        terminal(track.target, true);
      } else {
        activeTargets.push_back(track.target);
      }
    }
    if (!activeTargets.empty()) {
      active[handle] = {std::move(activeTargets), std::move(terminal)};
    }
  }

  void cancel(const AnimationHandle &handle, const std::vector<AnimationTarget> &targets) override {
    cancelled.emplace_back(handle, targets);
    const auto activeIt = active.find(handle);
    if (activeIt == active.end()) {
      return;
    }
    for (const auto target : targets) {
      std::erase(activeIt->second.targets, target);
    }
    if (activeIt->second.targets.empty()) {
      active.erase(activeIt);
    }
  }

  std::variant<std::vector<CapturedTargetValue>, AnimationResultReason> handoff(
      const AnimationHandle &handle,
      const std::vector<AnimationTarget> &targets) override {
    if (handoffFailure) {
      return *handoffFailure;
    }
    std::vector<CapturedTargetValue> values;
    for (const auto target : targets) {
      values.push_back({target, 0.5});
    }
    active.erase(handle);
    return values;
  }

  void complete(const AnimationHandle &handle, const AnimationTarget target, const bool finished = true) {
    const auto it = active.find(handle);
    if (it == active.end() || std::ranges::find(it->second.targets, target) == it->second.targets.end()) {
      return;
    }
    auto terminal = it->second.terminal;
    std::erase(it->second.targets, target);
    if (it->second.targets.empty()) {
      active.erase(it);
    }
    terminal(target, finished);
  }

  struct ActiveCommand {
    std::vector<AnimationTarget> targets;
    NativeTrackTerminalCallback terminal;
  };

  struct ZeroDurationTrack {
    AnimationHandle handle;
    AnimationTarget target;
    double delayMs{0};
  };

  std::optional<AnimationResultReason> preparationFailure;
  std::optional<AnimationResultReason> handoffFailure;
  std::function<void(AnimationHandle)> onStart;
  std::vector<AnimationHandle> started;
  std::vector<NativeTrackInterruption> interrupted;
  std::vector<ZeroDurationTrack> zeroDuration;
  std::vector<std::pair<AnimationHandle, std::vector<AnimationTarget>>> cancelled;
  std::unordered_map<AnimationHandle, ActiveCommand, AnimationHandleHash> active;
};

class TestAppleNativeAnimationExecutor final : public TestNativeAnimationExecutor {};
class TestAndroidNativeAnimationExecutor final : public TestNativeAnimationExecutor {};

#ifndef NDEBUG

class TestNativeAnimationTraceRecorder final : public NativeAnimationTraceSink {
 public:
  void record(NativeAnimationTraceEvent event) override {
    event.sequence = nextSequence_++;
    events.push_back(std::move(event));
  }

  std::vector<NativeAnimationTraceEvent> events;

 private:
  uint64_t nextSequence_{1};
};

#endif

} // namespace reanimated::native_animation::testing
