#include <harness/AnimationHarness.h>

#include <utility>

#include <ReactCommon/CallInvoker.h>
#include <hermes/hermes.h>
#include <jsi/jsi.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsManager.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.h>
#ifdef HARNESS_PROXY_REGISTRY
#include <reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.h>
#endif
#include <worklets/Compat/StableApi.h>
#include <worklets/Tools/UIScheduler.h>

namespace reanimated::layout_animation::test {

using namespace facebook;
using namespace facebook::react;

namespace {

class NamedConfig final : public worklets::Serializable {
 public:
  explicit NamedConfig(std::string name) : Serializable(ValueType::ObjectType), name_(std::move(name)) {}

  jsi::Value toJSValue(jsi::Runtime &runtime) override {
    auto value = jsi::Object(runtime);
    value.setProperty(runtime, "name", jsi::String::createFromUtf8(runtime, name_));
    return value;
  }

 private:
  std::string name_;
};

class TimelineUIScheduler final : public worklets::UIScheduler {
 public:
  explicit TimelineUIScheduler(Choreographer &timeline) : timeline_(timeline) {}

  void scheduleOnUI(std::function<void()> job) override {
    if (timeline_.isOn(Lane::UI)) {
      job();
    } else {
      timeline_.post(Lane::UI, std::move(job));
    }
  }

  void triggerUI() override {}

#if defined(HARNESS_PROXY_REGISTRY) || defined(HARNESS_PROXY_SHADOW_TREE_START)
  bool queryIsOnUIThread() const override {
    return timeline_.isOn(Lane::UI);
  }
#endif

 private:
  Choreographer &timeline_;
};

class TimelineCallInvoker final : public CallInvoker {
 public:
  TimelineCallInvoker(Choreographer &timeline, jsi::Runtime &runtime) : timeline_(timeline), runtime_(runtime) {}

  void invokeAsync(CallFunc &&function) noexcept override {
    timeline_.post(Lane::JS, [this, function = std::move(function)]() mutable { function(runtime_); });
  }

  void invokeSync(CallFunc &&function) override {
    function(runtime_);
  }

 private:
  Choreographer &timeline_;
  jsi::Runtime &runtime_;
};

void setIfPresent(jsi::Runtime &runtime, jsi::Object &object, const char *name, const std::optional<double> &value) {
  if (value) {
    object.setProperty(runtime, name, *value);
  }
}

void recordNumericProperties(
    jsi::Runtime &runtime,
    const jsi::Object &object,
    const std::string &prefix,
    std::unordered_map<std::string, double> &recordedValues) {
  auto names = object.getPropertyNames(runtime);
  for (size_t index = 0; index < names.size(runtime); ++index) {
    auto name = names.getValueAtIndex(runtime, index).asString(runtime);
    auto value = object.getProperty(runtime, name);
    if (value.isNumber()) {
      recordedValues.emplace(prefix + name.utf8(runtime), value.asNumber());
    }
  }
}

} // namespace

AnimationConfig animation(AnimationConfig config) {
  return config;
}

AnimationConfig removeAnimation(AnimationConfig config) {
  config.name.reset();
  config.sharedTransitionTag.clear();
  return config;
}

AnimationHarness::AnimationHarness(DriverMode mode)
    : mode_(mode),
      runtime_(facebook::hermes::makeHermesRuntime()),
      uiScheduler_(std::make_shared<TimelineUIScheduler>(timeline_)),
      manager_(std::make_shared<LayoutAnimationsManager>()),
      platform_(timeline_, mode) {
#ifdef ANDROID
  jsInvoker_ = std::make_shared<TimelineCallInvoker>(timeline_, *runtime_);
  auto preserveMountedTags = [this](std::vector<int> &tags) -> std::optional<std::unique_ptr<int[]>> {
    auto mountedTags = std::make_unique<int[]>(tags.size());
    for (size_t index = 0; index < tags.size(); ++index) {
      mountedTags[index] = platform_.hostTree().hasTag(tags[index]) ? tags[index] : -1;
    }
    return mountedTags;
  };
#endif
  installAnimationRepository();
#ifdef HARNESS_PROXY_REGISTRY
  const auto dependencies = LayoutAnimationsProxyDependencies{
      .layoutAnimationsManager = manager_,
      .componentDescriptorRegistry = platform_.componentDescriptorRegistry(),
      .contextContainer = platform_.contextContainer(),
      .uiRuntime = *runtime_,
      .uiScheduler = uiScheduler_,
      .uiManager = platform_.uiManager(),
#ifdef ANDROID
      .filterUnmountedTagsFunction = preserveMountedTags,
      .jsInvoker = jsInvoker_,
#endif
#ifdef __APPLE__
      .forceScreenSnapshot = [](Tag) {},
#endif
  };
  proxyRegistry_ = createLayoutAnimationsProxyExperimentalRegistry(dependencies);
  platform_.visitShadowTree(
      [this](const ShadowTree &shadowTree) { proxy_ = proxyRegistry_->registerSurface(shadowTree); });
#else
#ifdef HARNESS_PROXY_SHADOW_TREE_START
  proxy_ = std::make_shared<LayoutAnimationsProxy_Experimental>(
      manager_,
      platform_.componentDescriptorRegistry(),
      platform_.contextContainer(),
      *runtime_,
      uiScheduler_,
      platform_.uiManager()
#ifdef ANDROID
          ,
      preserveMountedTags,
      jsInvoker_
#endif
  );
  platform_.visitShadowTree([this](const ShadowTree &shadowTree) { proxy_->startSurface(shadowTree); });
#else
#ifdef ANDROID
  proxy_ = std::make_shared<LayoutAnimationsProxy_Experimental>(
      manager_,
      platform_.componentDescriptorRegistry(),
      platform_.contextContainer(),
      *runtime_,
      uiScheduler_,
      preserveMountedTags,
      platform_.uiManager(),
      jsInvoker_);
#else
  proxy_ = std::make_shared<LayoutAnimationsProxy_Experimental>(
      manager_, platform_.componentDescriptorRegistry(), platform_.contextContainer(), *runtime_, uiScheduler_);
#endif
  proxy_->startSurface(1);
#endif
#ifdef __APPLE__
  proxy_->setForceScreenSnapshotFunction([](Tag) {});
#endif
#ifndef HARNESS_PROXY_SHADOW_TREE_START
  platform_.setMountingOverrideDelegate(proxy_);
#endif
#endif
}

AnimationHarness::~AnimationHarness() {
#ifdef HARNESS_PROXY_REGISTRY
  proxyRegistry_->remove(1);
#endif
}

Choreographer &AnimationHarness::timeline() {
  return timeline_;
}

PlatformDriver &AnimationHarness::platform() {
  return platform_;
}

DriverMode AnimationHarness::mode() const {
  return mode_;
}

void AnimationHarness::configureAnimations(const std::vector<AnimationConfig> &configs) {
  timeline_.requireLane(Lane::JS);
  auto batch = std::vector<LayoutAnimationConfig>{};
  batch.reserve(configs.size());
  for (const auto &config : configs) {
    batch.push_back({
        .tag = config.tag,
        .type = config.type,
        .config = config.name ? std::make_shared<NamedConfig>(*config.name) : nullptr,
        .sharedTransitionTag = config.sharedTransitionTag,
    });
  }
  manager_->configureAnimationBatch(batch);
}

void AnimationHarness::setShouldAnimateExiting(Tag tag, bool shouldAnimate) {
  timeline_.requireLane(Lane::JS);
  manager_->setShouldAnimateExiting(tag, shouldAnimate);
}

void AnimationHarness::render(const Snapshot &snapshot) {
  timeline_.requireLane(Lane::JS);
  platform_.render(snapshot);
}

void AnimationHarness::progress(Tag tag, const ProgressStyle &style) {
  timeline_.requireLane(Lane::UI);
  auto value = jsi::Object(*runtime_);
  setIfPresent(*runtime_, value, "originX", style.x);
  setIfPresent(*runtime_, value, "originY", style.y);
  setIfPresent(*runtime_, value, "width", style.width);
  setIfPresent(*runtime_, value, "height", style.height);
  setIfPresent(*runtime_, value, "opacity", style.opacity);
#ifdef HARNESS_PROXY_REGISTRY
  flushRequested_ |= proxyRegistry_->progressLayoutAnimation(tag, value).has_value();
#else
  flushRequested_ |= proxy_->progressLayoutAnimation(tag, value).has_value();
#endif
}

void AnimationHarness::end(Tag tag, bool shouldRemove) {
  timeline_.requireLane(Lane::UI);
#ifdef HARNESS_PROXY_REGISTRY
  flushRequested_ |= proxyRegistry_->endLayoutAnimation(tag, shouldRemove).has_value();
#else
  flushRequested_ |= proxy_->endLayoutAnimation(tag, shouldRemove).has_value();
#endif
  activeAnimations_.erase(tag);
}

void AnimationHarness::transitionProgress(Tag boundaryTag, double progress, bool isClosing, bool isGoingForward) {
  timeline_.requireLane(Lane::UI);
#ifdef HARNESS_PROXY_REGISTRY
  flushRequested_ |= proxyRegistry_->onTransitionProgress(boundaryTag, progress, isClosing, isGoingForward).has_value();
#else
  flushRequested_ |= proxy_->onTransitionProgress(boundaryTag, progress, isClosing, isGoingForward).has_value();
#endif
}

void AnimationHarness::cancelTransition(Tag sourceTag) {
  timeline_.requireLane(Lane::UI);
#ifdef HARNESS_PROXY_REGISTRY
  flushRequested_ |= proxyRegistry_->onGestureCancel(sourceTag).has_value();
#else
  flushRequested_ |= proxy_->onGestureCancel().has_value();
#endif
}

void AnimationHarness::frame() {
  timeline_.requireLane(Lane::UI);
  if (std::exchange(flushRequested_, false)) {
    platform_.flushMountingCoordinator();
  }
  if (mode_ != DriverMode::IOS) {
    platform_.frame();
  }
}

const std::vector<AnimationStart> &AnimationHarness::starts() const {
  return starts_;
}

const std::vector<Tag> &AnimationHarness::stops() const {
  return stops_;
}

bool AnimationHarness::isActive(Tag tag) const {
  return activeAnimations_.contains(tag);
}

void AnimationHarness::completeAnimationsOnStart() {
  completeAnimationsOnStart_ = true;
}

void AnimationHarness::clearCalls() {
  starts_.clear();
  stops_.clear();
}

AnimationTimeline::AnimationTimeline(AnimationHarness &harness) : harness_(harness) {}

void AnimationTimeline::configureAnimations(ConfigureAnimations event) {
  auto &timeline = harness_.timeline();
  timeline.at(event.at, Lane::JS, [this, animations = std::move(event.animations)] {
    harness_.configureAnimations(animations);
  });
  timeline.advanceTo(event.at);
}

void AnimationTimeline::render(RenderTree event) {
  auto &timeline = harness_.timeline();
  timeline.at(event.at, Lane::JS, [this, tree = std::move(event.tree)] { harness_.render(tree); });
  if (harness_.mode() == DriverMode::IOS) {
    timeline.advanceTo(event.at);
    return;
  }
  const auto frameTime = event.at + std::chrono::milliseconds{1};
  timeline.at(frameTime, Lane::UI, [this] { harness_.frame(); });
  timeline.advanceTo(frameTime);
}

void AnimationTimeline::progress(ProgressAnimation event) {
  onUI({
      .at = event.at,
      .task = [this, tag = event.tag, style = std::move(event.style)] { harness_.progress(tag, style); },
  });
}

void AnimationTimeline::end(EndAnimation event) {
  onUI({
      .at = event.at,
      .task = [this, tag = event.tag, removeView = event.removeView] { harness_.end(tag, removeView); },
  });
}

void AnimationTimeline::transitionProgress(TransitionProgress event) {
  onUI({
      .at = event.at,
      .task = [this,
               targetTag = event.targetTag,
               progress = event.progress,
               closing = event.closing,
               goingForward =
                   event.goingForward] { harness_.transitionProgress(targetTag, progress, closing, goingForward); },
  });
}

void AnimationTimeline::cancelTransition(CancelTransition event) {
  onUI({
      .at = event.at,
      .task = [this, sourceTag = event.sourceTag] { harness_.cancelTransition(sourceTag); },
  });
}

void AnimationTimeline::setShouldAnimateExiting(ExitingPolicy event) {
  auto &timeline = harness_.timeline();
  timeline.at(event.at, Lane::JS, [this, tag = event.tag, animate = event.animate] {
    harness_.setShouldAnimateExiting(tag, animate);
  });
  timeline.advanceTo(event.at);
}

void AnimationTimeline::onUI(UIEvent event) {
  auto &timeline = harness_.timeline();
  timeline.at(event.at, Lane::UI, [this, task = std::move(event.task)] {
    if (task) {
      task();
    }
    harness_.frame();
  });
  const auto followUpTime = event.at + std::chrono::milliseconds{1};
  timeline.at(followUpTime, Lane::UI, [this] { harness_.frame(); });
  timeline.advanceTo(followUpTime);
}

void AnimationHarness::installAnimationRepository() {
  auto repository = jsi::Object(*runtime_);
  repository.setProperty(
      *runtime_,
      "start",
      jsi::Function::createFromHostFunction(
          *runtime_,
          jsi::PropNameID::forAscii(*runtime_, "start"),
          4,
          [this](jsi::Runtime &runtime, const jsi::Value &, const jsi::Value *arguments, size_t count) {
            recordStart(runtime, arguments, count);
            return jsi::Value::undefined();
          }));
  repository.setProperty(
      *runtime_,
      "stop",
      jsi::Function::createFromHostFunction(
          *runtime_,
          jsi::PropNameID::forAscii(*runtime_, "stop"),
          1,
          [this](jsi::Runtime &, const jsi::Value &, const jsi::Value *arguments, size_t count) {
            if (count == 1) {
              auto tag = static_cast<Tag>(arguments[0].asNumber());
              stops_.push_back(tag);
              activeAnimations_.erase(tag);
            }
            return jsi::Value::undefined();
          }));

  auto global = runtime_->global();
  global.setProperty(*runtime_, "LayoutAnimationsManager", jsi::Value(*runtime_, repository));
  global.setProperty(*runtime_, "global", jsi::Value(*runtime_, global));
}

void AnimationHarness::recordStart(jsi::Runtime &runtime, const jsi::Value *arguments, size_t count) {
  if (count != 4) {
    throw std::invalid_argument("Layout animation start requires four arguments");
  }

  auto tag = static_cast<Tag>(arguments[0].asNumber());
  if (activeAnimations_.erase(tag) != 0) {
#ifdef HARNESS_PROXY_REGISTRY
    flushRequested_ |= proxyRegistry_->endLayoutAnimation(tag, false).has_value();
#else
    flushRequested_ |= proxy_->endLayoutAnimation(tag, false).has_value();
#endif
  }

  auto values = arguments[2].asObject(runtime);
  auto recordedValues = std::unordered_map<std::string, double>{};
  recordNumericProperties(runtime, values, {}, recordedValues);
  auto valueNames = values.getPropertyNames(runtime);
  for (size_t index = 0; index < valueNames.size(runtime); ++index) {
    auto name = valueNames.getValueAtIndex(runtime, index).asString(runtime);
    auto value = values.getProperty(runtime, name);
    auto key = name.utf8(runtime);
    if (value.isObject() && (key == "source" || key == "target")) {
      recordNumericProperties(runtime, value.asObject(runtime), key + ".", recordedValues);
    }
  }

  auto config = arguments[3].asObject(runtime).getProperty(runtime, "name").asString(runtime).utf8(runtime);
  const auto type = static_cast<LayoutAnimationType>(arguments[1].asNumber());
  starts_.push_back({
      .tag = tag,
      .type = type,
      .config = std::move(config),
      .values = std::move(recordedValues),
  });
  activeAnimations_.insert(tag);
  if (completeAnimationsOnStart_) {
    end(tag, type == LayoutAnimationType::EXITING);
  }
}

} // namespace reanimated::layout_animation::test
