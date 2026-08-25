#pragma once

#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include <harness/Choreographer.h>
#include <harness/PlatformDriver.h>
#include <harness/Tree.h>

#include <reanimated/LayoutAnimations/LayoutAnimationType.h>

namespace facebook::jsi {
class Runtime;
class Value;
} // namespace facebook::jsi

namespace facebook::react {
class CallInvoker;
}

namespace worklets {
class UIScheduler;
}

namespace reanimated {
class LayoutAnimationsManager;
struct LayoutAnimationsProxy_Experimental;
} // namespace reanimated

namespace reanimated::layout_animation::test {

struct AnimationConfig {
  facebook::react::Tag tag;
  LayoutAnimationType type;
  std::optional<std::string> name;
  std::string sharedTransitionTag;
};

AnimationConfig
animation(facebook::react::Tag tag, LayoutAnimationType type, std::string name, std::string sharedTransitionTag = {});
AnimationConfig removeAnimation(facebook::react::Tag tag, LayoutAnimationType type);

struct AnimationStart {
  facebook::react::Tag tag;
  LayoutAnimationType type;
  std::string config;
  std::unordered_map<std::string, double> values;
};

struct ProgressStyle {
  std::optional<double> x;
  std::optional<double> y;
  std::optional<double> width;
  std::optional<double> height;
  std::optional<double> opacity;
};

class AnimationHarness {
 public:
  explicit AnimationHarness(DriverMode mode);
  ~AnimationHarness();

  AnimationHarness(const AnimationHarness &) = delete;
  AnimationHarness &operator=(const AnimationHarness &) = delete;

  Choreographer &timeline();
  PlatformDriver &platform();

  void configure(const std::vector<AnimationConfig> &configs);
  void setShouldAnimateExiting(facebook::react::Tag tag, bool shouldAnimate);
  void render(const Snapshot &snapshot, const std::vector<AnimationConfig> &configs = {});
  void progress(facebook::react::Tag tag, const ProgressStyle &style);
  void end(facebook::react::Tag tag, bool shouldRemove);
  void transitionProgress(facebook::react::Tag boundaryTag, double progress, bool isClosing, bool isGoingForward);
  void cancelTransition();
  void frame();

  const std::vector<AnimationStart> &starts() const;
  const std::vector<facebook::react::Tag> &stops() const;
  bool isActive(facebook::react::Tag tag) const;
  void clearCalls();

 private:
  void installAnimationRepository();
  void recordStart(facebook::jsi::Runtime &runtime, const facebook::jsi::Value *arguments, size_t count);

  DriverMode mode_;
  Choreographer timeline_;
  std::unique_ptr<facebook::jsi::Runtime> runtime_;
  std::shared_ptr<worklets::UIScheduler> uiScheduler_;
  std::shared_ptr<facebook::react::CallInvoker> jsInvoker_;
  std::shared_ptr<LayoutAnimationsManager> manager_;
  PlatformDriver platform_;
  std::shared_ptr<LayoutAnimationsProxy_Experimental> proxy_;
  bool flushRequested_{false};
  std::vector<AnimationStart> starts_;
  std::vector<facebook::react::Tag> stops_;
  std::unordered_set<facebook::react::Tag> activeAnimations_;
};

} // namespace reanimated::layout_animation::test
