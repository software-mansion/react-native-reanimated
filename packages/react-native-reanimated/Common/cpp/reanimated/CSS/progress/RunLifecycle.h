#pragma once

#include <cstdint>
#include <functional>

namespace reanimated::css {

/// The phases a run moves through, named after the CSS event tables. A run is
/// Idle before it exists, Before while its delay has yet to pass, Active while
/// it produces values, and After once it is done.
enum class RunPhase : std::uint8_t { Idle, Before, Active, After };

enum class RunMilestone : std::uint8_t { Created, Started, Ended, Repeated, Aborted };

/// Which of the run's times a milestone carries. The same milestone reports a
/// different one depending on the phase change that produced it, so the owner
/// cannot derive this from the milestone alone.
enum class MilestoneTime : std::uint8_t { IntervalStart, IntervalEnd, IterationStart, IterationEnd, ActiveTime };

/// Reports the milestones a run crosses, following the phase change tables in
/// css-animations-2 and css-transitions-2. Both tables agree on the phase
/// changes and the times, so this knows nothing about animations or
/// transitions: the owner maps milestones to its own events, and a kind
/// without iterations never passes one.
class RunLifecycle {
 public:
  using Reporter = std::function<void(RunMilestone, MilestoneTime)>;

  void setMilestoneReporter(Reporter reporter);
  void reachPhase(RunPhase phase, unsigned iteration = 1);
  void abort();

  bool hasStarted() const;
  bool hasEnded() const;

 private:
  void report(RunMilestone milestone, MilestoneTime time);
  void reportIterationBoundary(unsigned iteration);

  RunPhase phase_{RunPhase::Idle};
  unsigned iteration_{1};
  bool endReported_{false};
  bool aborted_{false};
  Reporter reporter_;
};

} // namespace reanimated::css
