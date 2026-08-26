#pragma once

#include <array>
#include <chrono>
#include <cstdint>
#include <functional>
#include <optional>
#include <vector>

namespace reanimated::layout_animation::test {

enum class Lane : uint8_t { JS, UI };

class Choreographer {
 public:
  using Time = std::chrono::milliseconds;
  using Task = std::function<void()>;

  void at(Time time, Lane lane, Task task);
  void post(Lane lane, Task task);
  void busyUntil(Lane lane, Time time);
  void advanceTo(Time time);
  void advanceBy(Time duration);

  Time now() const;
  bool isOn(Lane lane) const;
  void requireLane(Lane lane) const;
  size_t pendingTaskCount() const;

 private:
  struct ScheduledTask {
    Time time;
    uint64_t sequence;
    Lane lane;
    Task task;
  };

  Time taskTime(const ScheduledTask &task) const;

  Time now_{0};
  std::array<Time, 2> busyUntil_{};
  std::optional<Lane> currentLane_;
  uint64_t nextSequence_{0};
  std::vector<ScheduledTask> tasks_;
};

} // namespace reanimated::layout_animation::test
