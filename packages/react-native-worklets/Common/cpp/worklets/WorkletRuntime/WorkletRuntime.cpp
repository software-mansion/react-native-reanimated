#include <worklets/Resources/ValueUnpacker.h>
#include <worklets/Tools/Defs.h>
#include <worklets/Tools/JSISerializer.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>
#include <worklets/WorkletRuntime/WorkletRuntimeDecorator.h>

#include <cxxreact/MessageQueueThread.h>
#include <jsi/decorator.h>
#include <jsi/jsi.h>

#include <memory>
#include <utility>

#if JS_RUNTIME_HERMES
#include <worklets/WorkletRuntime/WorkletHermesRuntime.h>
#else
#include <jsc/JSCRuntime.h>
#endif // JS_RUNTIME

namespace worklets {

class AroundLock {
  const std::shared_ptr<std::recursive_mutex> mutex_;

 public:
  explicit AroundLock(const std::shared_ptr<std::recursive_mutex> &mutex)
      : mutex_(mutex) {}

  void before() const {
    mutex_->lock();
  }

  void after() const {
    mutex_->unlock();
  }
};

class LockableRuntime : public jsi::WithRuntimeDecorator<AroundLock> {
  AroundLock aroundLock_;
  std::shared_ptr<jsi::Runtime> runtime_;

 public:
  explicit LockableRuntime(
      std::shared_ptr<jsi::Runtime> &runtime,
      const std::shared_ptr<std::recursive_mutex> &runtimeMutex)
      : jsi::WithRuntimeDecorator<AroundLock>(*runtime, aroundLock_),
        aroundLock_(runtimeMutex),
        runtime_(std::move(runtime)) {}
};

static std::shared_ptr<jsi::Runtime> makeRuntime(
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::string &name,
    const bool supportsLocking,
    const std::shared_ptr<std::recursive_mutex> &runtimeMutex) {
  std::shared_ptr<jsi::Runtime> jsiRuntime;
#if JS_RUNTIME_HERMES
  auto hermesRuntime = facebook::hermes::makeHermesRuntime();
  jsiRuntime = std::make_shared<WorkletHermesRuntime>(
      std::move(hermesRuntime), jsQueue, name);
#else
  jsiRuntime = facebook::jsc::makeJSCRuntime();
#endif

  if (supportsLocking) {
    return std::make_shared<LockableRuntime>(jsiRuntime, runtimeMutex);
  } else {
    return jsiRuntime;
  }
}

class WorkletsHostTargetDelegate
    : public facebook::react::jsinspector_modern::HostTargetDelegate {
 public:
  WorkletsHostTargetDelegate() {}

  jsinspector_modern::HostTargetMetadata getMetadata() override {
    return {
        .appDisplayName = "FabricExample",
        .appIdentifier = "org.reactjs.native.example.FabricExample",
        .deviceName = "iPhone 16 Pro",
        .integrationName = "iOS Bridgeless (RCTHost)",
        .platform = "ios",
        .reactNativeVersion = "0.80.0-rc.4",
    };
  }

  void onReload(const PageReloadRequest &request) override {
    // Do nothing
  }

  void onSetPausedInDebuggerMessage(
      const OverlaySetPausedInDebuggerMessageRequest &request) override {
    // Do nothing
  }
};

WorkletRuntime::WorkletRuntime(
    std::shared_ptr<jsi::HostObject> &&jsiWorkletsModuleProxy,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::string &name,
    const bool supportsLocking,
    const bool isDevBundle,
    const std::shared_ptr<const BigStringBuffer> &script,
    const std::string &sourceUrl)
    : runtimeMutex_(std::make_shared<std::recursive_mutex>()),
      runtime_(makeRuntime(jsQueue, name, supportsLocking, runtimeMutex_)),
#ifndef NDEBUG
      supportsLocking_(supportsLocking),
#endif
      name_(name) {
  jsi::Runtime &rt = *runtime_;
  WorkletRuntimeCollector::install(rt);

  inspectorHostDelegate_ = std::make_unique<WorkletsHostTargetDelegate>();

  inspectorTarget_ = facebook::react::jsinspector_modern::HostTarget::create(
      *inspectorHostDelegate_, [](auto callback) {
        // TODO: RCTExecuteOnMainQueue(^{
        callback();
        // TODO: });
      });

  inspectorPageId_ =
      facebook::react::jsinspector_modern::getInspectorInstance().addPage(
          "Reanimated UI runtime",
          /* vm */ "",
          [this](std::unique_ptr<
                 facebook::react::jsinspector_modern::IRemoteConnection> remote)
              -> std::unique_ptr<
                  facebook::react::jsinspector_modern::ILocalConnection> {
            // TODO: use weak_ptr
            return inspectorTarget_->connect(std::move(remote));
          },
          {.nativePageReloads = true, .prefersFuseboxFrontend = true});

  auto optimizedJsiWorkletsModuleProxy =
      jsi_utils::optimizedFromHostObject(rt, std::move(jsiWorkletsModuleProxy));

  WorkletRuntimeDecorator::decorate(
      rt,
      name,
      jsScheduler,
      isDevBundle,
      std::move(optimizedJsiWorkletsModuleProxy));

#ifdef WORKLETS_EXPERIMENTAL_BUNDLING
  if (!script) {
    throw std::runtime_error(
        "[Worklets] Expected to receive the bundle, but got nullptr instead.");
  }

  try {
    rt.evaluateJavaScript(script, sourceUrl);
  } catch (facebook::jsi::JSIException ex) {
    // Nothing
  }
#else
  // Legacy behavior
  auto valueUnpackerBuffer =
      std::make_shared<const jsi::StringBuffer>(ValueUnpackerCode);
  rt.evaluateJavaScript(valueUnpackerBuffer, "valueUnpacker");
#endif // WORKLETS_EXPERIMENTAL_BUNDLING
}

WorkletRuntime::~WorkletRuntime() {
  if (inspectorPageId_.has_value()) {
    facebook::react::jsinspector_modern::getInspectorInstance().removePage(
        *inspectorPageId_);
    inspectorPageId_.reset();
    inspectorTarget_.reset();
  }
}

jsi::Value WorkletRuntime::executeSync(
    jsi::Runtime &rt,
    const jsi::Value &worklet) const {
  react_native_assert(
      supportsLocking_ &&
      ("[Worklets] Runtime \"" + name_ + "\" doesn't support locking.")
          .c_str());
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt,
      worklet,
      "[Worklets] Only worklets can be executed synchronously on UI runtime.");
  auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
  jsi::Runtime &uiRuntime = getJSIRuntime();
  auto result = runGuarded(shareableWorklet);
  auto shareableResult = extractShareableOrThrow(uiRuntime, result);
  lock.unlock();
  return shareableResult->toJSValue(rt);
}

jsi::Value WorkletRuntime::get(
    jsi::Runtime &rt,
    const jsi::PropNameID &propName) {
  auto name = propName.utf8(rt);
  if (name == "toString") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        0,
        [weakThis = weak_from_this()](
            jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t)
            -> jsi::Value {
          auto strongThis = weakThis.lock();
          if (!strongThis) {
            return jsi::String::createFromUtf8(rt, "");
          }

          return jsi::String::createFromUtf8(rt, strongThis->toString());
        });
  }
  if (name == "name") {
    return jsi::String::createFromUtf8(rt, name_);
  }
  return jsi::Value::undefined();
}

std::vector<jsi::PropNameID> WorkletRuntime::getPropertyNames(
    jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> result;
  result.push_back(jsi::PropNameID::forUtf8(rt, "toString"));
  result.push_back(jsi::PropNameID::forUtf8(rt, "name"));
  return result;
}

std::shared_ptr<WorkletRuntime> extractWorkletRuntime(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return value.getObject(rt).getHostObject<WorkletRuntime>(rt);
}

void scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &shareableWorkletValue) {
  auto workletRuntime = extractWorkletRuntime(rt, workletRuntimeValue);
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt,
      shareableWorkletValue,
      "[Worklets] Function passed to `_scheduleOnRuntime` is not a shareable worklet.");
  workletRuntime->runAsyncGuarded(shareableWorklet);
}

} // namespace worklets
