#include <reanimated/CSS/progress/RunLifecycle.h>

#include <algorithm>
#include <utility>

namespace reanimated::css {

void RunLifecycle::setMilestoneReporter(Reporter reporter) {
  reporter_ = std::move(reporter);
}

void RunLifecycle::reachPosition(const RunStage stage, const unsigned repeat) {
  // An abort ends the run for good. Removal from the loop is only enqueued, so
  // a frame already in flight can still position an aborted run.
  if (aborted_) {
    return;
  }

  const auto target = rank(stage);

  // Longer settings pull a finished run back so it can reach the end again.
  if (target < reported_ && hasEnded()) {
    reported_ = target;
  }

  enterStagesUpTo(std::min(target, rank(RunStage::Started)));

  // One position reports one repeat however many the run stepped over.
  if (hasStarted() && repeat > repeat_) {
    repeat_ = repeat;
    report(RunMilestone::Repeated);
  }

  enterStagesUpTo(target);
}

void RunLifecycle::abort() {
  if (aborted_ || hasEnded()) {
    return;
  }

  // A run exists from creation, so an early abort still reports Created.
  enterStagesUpTo(rank(RunStage::Created));

  aborted_ = true;
  report(RunMilestone::Aborted);
}

bool RunLifecycle::hasStarted() const {
  return reported_ >= rank(RunStage::Started);
}

bool RunLifecycle::hasEnded() const {
  return reported_ == rank(RunStage::Ended);
}

void RunLifecycle::enterStagesUpTo(const std::size_t target) {
  // A reporter may abort from inside a milestone, which ends the ladder here.
  while (reported_ < target && !aborted_) {
    report(static_cast<RunMilestone>(++reported_));
  }
}

void RunLifecycle::report(const RunMilestone milestone) const {
  if (reporter_) {
    reporter_(milestone);
  }
}

} // namespace reanimated::css
