#include <reanimated/CSS/progress/RunLifecycle.h>

#include <utility>

namespace reanimated::css {

void RunLifecycle::setMilestoneReporter(Reporter reporter) {
  reporter_ = std::move(reporter);
}

void RunLifecycle::reachPhase(const RunPhase phase, const unsigned iteration) {
  // Removal from the loop is only enqueued, so a frame already in flight can
  // still tick a run that was just aborted.
  if (aborted_) {
    return;
  }

  if (phase == phase_) {
    reportIterationBoundary(iteration);
    return;
  }

  const auto from = std::exchange(phase_, phase);
  // Boundaries the run stepped over outside its active phase are not reported.
  iteration_ = iteration;

  if (from == RunPhase::After) {
    // Re-entering a finished run starts it again, timed at the end of the
    // interval it had already reached.
    report(RunMilestone::Started, MilestoneTime::IntervalEnd);
    if (phase == RunPhase::Before) {
      report(RunMilestone::Ended, MilestoneTime::IntervalStart);
    }
    return;
  }

  if (from == RunPhase::Active) {
    report(RunMilestone::Ended, phase == RunPhase::After ? MilestoneTime::IntervalEnd : MilestoneTime::IntervalStart);
    return;
  }

  if (from == RunPhase::Idle) {
    report(RunMilestone::Created, MilestoneTime::IntervalStart);
  }
  if (phase == RunPhase::Before) {
    return;
  }
  report(RunMilestone::Started, MilestoneTime::IntervalStart);
  if (phase == RunPhase::After) {
    report(RunMilestone::Ended, MilestoneTime::IntervalEnd);
  }
}

void RunLifecycle::abort() {
  // Tracks the report rather than the phase: a reporter can abort part way
  // through a phase change that has not reached its end yet.
  if (aborted_ || endReported_) {
    return;
  }

  // A run exists from creation, so an early abort still reports it first. That
  // report can abort the run itself, leaving nothing for this call to do.
  if (phase_ == RunPhase::Idle) {
    reachPhase(RunPhase::Before);
    if (aborted_) {
      return;
    }
  }

  aborted_ = true;
  report(RunMilestone::Aborted, MilestoneTime::ActiveTime);
}

bool RunLifecycle::hasStarted() const {
  return phase_ == RunPhase::Active || phase_ == RunPhase::After;
}

bool RunLifecycle::hasEnded() const {
  return phase_ == RunPhase::After;
}

void RunLifecycle::reportIterationBoundary(const unsigned iteration) {
  // Against the previous sample, not the furthest the run has ever got, and
  // one sample reports one boundary however many it stepped over.
  if (phase_ != RunPhase::Active || iteration == iteration_) {
    return;
  }

  // Re-timing a run can drop it back an iteration, and the boundary it crossed
  // is then the end of the one it landed in rather than the start.
  const auto time = iteration < iteration_ ? MilestoneTime::IterationEnd : MilestoneTime::IterationStart;
  iteration_ = iteration;
  report(RunMilestone::Repeated, time);
}

void RunLifecycle::report(const RunMilestone milestone, const MilestoneTime time) {
  // An abort is the last thing a run reports, including when a reporter
  // triggers it from inside an earlier milestone.
  if (aborted_ && milestone != RunMilestone::Aborted) {
    return;
  }

  if (milestone == RunMilestone::Ended) {
    endReported_ = true;
  } else if (milestone == RunMilestone::Started) {
    endReported_ = false;
  }

  if (reporter_) {
    reporter_(milestone, time);
  }
}

} // namespace reanimated::css
