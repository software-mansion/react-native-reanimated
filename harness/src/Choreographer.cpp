#include <harness/Choreographer.h>

#include <algorithm>
#include <stdexcept>
#include <utility>

namespace reanimated::layout_animation::test {

namespace {

size_t laneIndex(Lane lane) {
  return static_cast<size_t>(lane);
}

} // namespace

void Choreographer::at(Time time, Lane lane, Task task) {
  if (time < now_) {
    throw std::invalid_argument("Cannot schedule a task before the current time");
  }

  tasks_.push_back({time, nextSequence_++, lane, std::move(task)});
}

void Choreographer::post(Lane lane, Task task) {
  at(now_, lane, std::move(task));
}

void Choreographer::busyUntil(Lane lane, Time time) {
  busyUntil_[laneIndex(lane)] = std::max(busyUntil_[laneIndex(lane)], time);
}

void Choreographer::advanceTo(Time time) {
  if (time < now_) {
    throw std::invalid_argument("Cannot move virtual time backwards");
  }

  while (true) {
    auto next = tasks_.end();
    auto nextTime = Time::max();

    for (auto iterator = tasks_.begin(); iterator != tasks_.end(); ++iterator) {
      auto timeForTask = taskTime(*iterator);
      if (timeForTask > time) {
        continue;
      }
      if (next == tasks_.end() || timeForTask < nextTime ||
          (timeForTask == nextTime && iterator->sequence < next->sequence)) {
        next = iterator;
        nextTime = timeForTask;
      }
    }

    if (next == tasks_.end()) {
      break;
    }

    auto task = std::move(*next);
    tasks_.erase(next);
    now_ = nextTime;

    auto previousLane = currentLane_;
    currentLane_ = task.lane;
    try {
      task.task();
    } catch (...) {
      currentLane_ = previousLane;
      throw;
    }
    currentLane_ = previousLane;
  }

  now_ = time;
}

void Choreographer::advanceBy(Time duration) {
  advanceTo(now_ + duration);
}

Choreographer::Time Choreographer::now() const {
  return now_;
}

bool Choreographer::isOn(Lane lane) const {
  return currentLane_ == lane;
}

void Choreographer::requireLane(Lane lane) const {
  if (!isOn(lane)) {
    throw std::logic_error("Event ran on the wrong virtual lane");
  }
}

size_t Choreographer::pendingTaskCount() const {
  return tasks_.size();
}

Choreographer::Time Choreographer::taskTime(const ScheduledTask &task) const {
  return std::max({task.time, busyUntil_[laneIndex(task.lane)], now_});
}

} // namespace reanimated::layout_animation::test
