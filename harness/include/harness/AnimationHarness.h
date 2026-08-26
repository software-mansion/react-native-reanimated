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
class LayoutAnimationsProxyCommon;
struct LayoutAnimationsProxy_Experimental;
#ifdef HARNESS_PROXY_REGISTRY
class LayoutAnimationsProxyRegistry;
#endif
} // namespace reanimated

namespace reanimated::layout_animation::test {

struct AnimationConfig {
  facebook::react::Tag tag;
  LayoutAnimationType type;
  std::optional<std::string> name;
  std::string sharedTransitionTag;
};

AnimationConfig animation(AnimationConfig config);
AnimationConfig removeAnimation(AnimationConfig config);

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
  DriverMode mode() const;

  void configureAnimations(const std::vector<AnimationConfig> &configs);
  void setShouldAnimateExiting(facebook::react::Tag tag, bool shouldAnimate);
  void render(const Snapshot &snapshot);
  void progress(facebook::react::Tag tag, const ProgressStyle &style);
  void end(facebook::react::Tag tag, bool shouldRemove);
  void transitionProgress(facebook::react::Tag boundaryTag, double progress, bool isClosing, bool isGoingForward);
  void cancelTransition(facebook::react::Tag sourceTag);
  void frame();

  const std::vector<AnimationStart> &starts() const;
  const std::vector<facebook::react::Tag> &stops() const;
  bool isActive(facebook::react::Tag tag) const;
  void completeAnimationsOnStart();
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
#ifdef HARNESS_PROXY_REGISTRY
  std::shared_ptr<LayoutAnimationsProxyRegistry> proxyRegistry_;
  std::shared_ptr<LayoutAnimationsProxyCommon> proxy_;
#else
  std::shared_ptr<LayoutAnimationsProxy_Experimental> proxy_;
#endif
  bool flushRequested_{false};
  std::vector<AnimationStart> starts_;
  std::vector<facebook::react::Tag> stops_;
  std::unordered_set<facebook::react::Tag> activeAnimations_;
  bool completeAnimationsOnStart_{false};
};

struct ConfigureAnimations {
  Choreographer::Time at;
  std::vector<AnimationConfig> animations;
};

struct RenderTree {
  Choreographer::Time at;
  Snapshot tree;
};

struct ProgressAnimation {
  Choreographer::Time at;
  facebook::react::Tag tag;
  ProgressStyle style;
};

struct EndAnimation {
  Choreographer::Time at;
  facebook::react::Tag tag;
  bool removeView;
};

struct TransitionProgress {
  Choreographer::Time at;
  facebook::react::Tag targetTag;
  double progress;
  bool closing;
  bool goingForward;
};

struct CancelTransition {
  Choreographer::Time at;
  facebook::react::Tag sourceTag;
};

struct ExitingPolicy {
  Choreographer::Time at;
  facebook::react::Tag tag;
  bool animate;
};

struct UIEvent {
  Choreographer::Time at;
  Choreographer::Task task;
};

class AnimationTimeline {
 public:
  explicit AnimationTimeline(AnimationHarness &harness);

  void configureAnimations(ConfigureAnimations event);
  void render(RenderTree event);
  void progress(ProgressAnimation event);
  void end(EndAnimation event);
  void transitionProgress(TransitionProgress event);
  void cancelTransition(CancelTransition event);
  void setShouldAnimateExiting(ExitingPolicy event);
  void onUI(UIEvent event);

 private:
  AnimationHarness &harness_;
};

} // namespace reanimated::layout_animation::test
