#pragma once

#include <cstddef>
#include <cstdint>
#include <functional>

namespace reanimated::css {

enum class RunStage : std::uint8_t { None, Created, Started, Ended };

/// Stage values share their rank with RunStage so the ladder can report a
/// stage without translating it.
enum class RunMilestone : std::uint8_t {
  Created = static_cast<std::uint8_t>(RunStage::Created),
  Started = static_cast<std::uint8_t>(RunStage::Started),
  Ended = static_cast<std::uint8_t>(RunStage::Ended),
  Repeated,
  Aborted,
};

/// Reports each milestone of a run once, in the order it is reached. Knows
/// nothing about animations or transitions: the owner maps milestones to its
/// own events, and a kind without repeats never passes one.
class RunLifecycle {
 public:
  using Reporter = std::function<void(RunMilestone)>;

  void onMilestone(Reporter reporter);
  void reachPosition(RunStage stage, unsigned repeat = 1);
  void abort();

  bool hasStarted() const;
  bool hasEnded() const;

 private:
  static constexpr std::size_t rank(RunStage stage) {
    return static_cast<std::size_t>(stage);
  }

  void report(RunMilestone milestone) const;
  void enterStagesUpTo(std::size_t target);

  std::size_t reported_{rank(RunStage::None)};
  unsigned repeat_{1};
  bool aborted_{false};
  Reporter reporter_;
};

} // namespace reanimated::css
