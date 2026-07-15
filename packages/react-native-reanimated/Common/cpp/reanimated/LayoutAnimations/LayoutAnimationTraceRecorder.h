#pragma once

// LayoutAnimationTrace start
#ifndef NDEBUG

#include <reanimated/LayoutAnimations/LayoutAnimationTrace.h>

#include <chrono>
#include <cstddef>
#include <cstdint>
#include <deque>
#include <mutex>
#include <optional>
#include <string>
#include <unordered_map>

namespace reanimated::layout_animation_trace {

struct Session {
  uint64_t runId;
  Backend backend;
  std::string scenario;
  std::optional<Environment> environment;
};

class Recorder final {
 public:
  static constexpr size_t kCapacity = 10000;

  static Recorder &getInstance();

  void start(Session session);
  void stop();
  void clear();

  [[nodiscard]] bool isActive() const;
  [[nodiscard]] std::string exportJSONL() const;
  uint64_t beginGeneration(int tag);
  [[nodiscard]] std::optional<uint64_t> getGeneration(int tag) const;

  void record(Event event);

 private:
  using Clock = std::chrono::steady_clock;

  Recorder() = default;

  mutable std::mutex mutex_;
  bool active_{false};
  std::optional<Session> session_;
  Clock::time_point sessionStart_{};
  uint64_t nextSequence_{1};
  uint64_t droppedEventCount_{0};
  std::deque<Event> events_;
  std::unordered_map<int, uint64_t> generations_;
};

} // namespace reanimated::layout_animation_trace

#endif // NDEBUG
// LayoutAnimationTrace end
