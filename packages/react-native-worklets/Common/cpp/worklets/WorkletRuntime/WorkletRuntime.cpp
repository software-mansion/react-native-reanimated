#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/Resources/Unpackers.h>
#include <worklets/Tools/Defs.h>
#include <worklets/Tools/JSISerializer.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/RuntimeHolder.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>
#include <worklets/WorkletRuntime/WorkletRuntimeDecorator.h>

#include <cxxreact/MessageQueueThread.h>
#include <jsi/decorator.h>
#include <jsi/jsi.h>

#include <memory>
#include <string>
#include <utility>
#include <vector>

#if JS_RUNTIME_HERMES
#include <worklets/WorkletRuntime/WorkletHermesRuntime.h>
#else
#include <jsc/JSCRuntime.h>
#endif // JS_RUNTIME

namespace worklets {

class AroundLock {
  const std::shared_ptr<std::recursive_mutex> mutex_;

 public:
  explicit AroundLock(const std::shared_ptr<std::recursive_mutex> &mutex) : mutex_(mutex) {}

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
    const std::shared_ptr<std::recursive_mutex> &runtimeMutex) {
  std::shared_ptr<jsi::Runtime> jsiRuntime;
#if JS_RUNTIME_HERMES
  auto hermesRuntime = facebook::hermes::makeHermesRuntime();
  jsiRuntime = std::make_shared<WorkletHermesRuntime>(std::move(hermesRuntime), jsQueue, name);
#else
  jsiRuntime = facebook::jsc::makeJSCRuntime();
#endif

  return std::make_shared<LockableRuntime>(jsiRuntime, runtimeMutex);
}

WorkletRuntime::WorkletRuntime(
    uint64_t runtimeId,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::string &name,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop)
    : runtimeId_(runtimeId),
      runtimeMutex_(std::make_shared<std::recursive_mutex>()),
      runtime_(makeRuntime(jsQueue, name, runtimeMutex_)),
      name_(name),
      queue_(queue) {
  jsi::Runtime &rt = *runtime_;
  WorkletRuntimeCollector::install(rt);
  if (enableEventLoop) {
    eventLoop_ = std::make_shared<EventLoop>(name_, runtime_, queue_);
    eventLoop_->run();
  }
}

void WorkletRuntime::init(std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy) {
  jsi::Runtime &rt = *runtime_;

#if REACT_NATIVE_MINOR_VERSION >= 81
  rt.setRuntimeData(
      RuntimeData::weakRuntimeUUID,
      std::make_shared<WeakRuntimeHolder>(WeakRuntimeHolder{.weakRuntime = weak_from_this()}));
#endif // REACT_NATIVE_MINOR_VERSION >= 81

  const auto jsScheduler = jsiWorkletsModuleProxy->getJSScheduler();
  const auto isDevBundle = jsiWorkletsModuleProxy->isDevBundle();
  const auto memoryManager_ = jsiWorkletsModuleProxy->getMemoryManager();
#ifdef WORKLETS_BUNDLE_MODE
  auto script = jsiWorkletsModuleProxy->getScript();
  const auto &sourceUrl = jsiWorkletsModuleProxy->getSourceUrl();
#endif // WORKLETS_BUNDLE_MODE

  auto optimizedJsiWorkletsModuleProxy = jsi_utils::optimizedFromHostObject(rt, std::move(jsiWorkletsModuleProxy));

  WorkletRuntimeDecorator::decorate(
      rt, name_, jsScheduler, isDevBundle, std::move(optimizedJsiWorkletsModuleProxy), eventLoop_);

#ifdef WORKLETS_BUNDLE_MODE
  if (!script) {
    throw std::runtime_error("[Worklets] Expected to receive the bundle, but got nullptr instead.");
  }

  try {
    rt.evaluateJavaScript(script, sourceUrl);
  } catch (facebook::jsi::JSError error) {
    const auto &message = error.getMessage();
    const auto &stack = error.getStack();
    if (!message.starts_with("[Worklets] Worklets initialized successfully")) {
      const auto newMessage = "[Worklets] Failed to initialize runtime. Reason: " + message;
      JSLogger::reportFatalErrorOnJS(
          jsScheduler, {.message = newMessage, .stack = stack, .name = "WorkletsError", .jsEngine = "Worklets"});
    }
  }
#else
  // Legacy behavior
  auto valueUnpackerBuffer = std::make_shared<const jsi::StringBuffer>(ValueUnpackerCode);
  rt.evaluateJavaScript(valueUnpackerBuffer, "valueUnpacker");

  auto synchronizableUnpackerBuffer = std::make_shared<const jsi::StringBuffer>(SynchronizableUnpackerCode);
  rt.evaluateJavaScript(synchronizableUnpackerBuffer, "synchronizableUnpacker");

  auto customSerializableUnpackerBuffer = std::make_shared<const jsi::StringBuffer>(CustomSerializableUnpackerCode);
  rt.evaluateJavaScript(customSerializableUnpackerBuffer, "customSerializableUnpacker");
#endif // WORKLETS_BUNDLE_MODE
  try {
    memoryManager_->loadAllCustomSerializables(shared_from_this());
  } catch (jsi::JSError &e) {
    throw std::runtime_error(std::string("[Worklets] Failed to load custom serializables. Reason: ") + e.getMessage());
  }
}

/* #region schedule */

void WorkletRuntime::schedule(jsi::Function &&function) const {
  react_native_assert(
      queue_ &&
      "[Worklets] Tried to invoke `schedule` on a Worklet Runtime but the "
      "async queue is not set. Recreate the runtime with a valid async queue.");
  queue_->push([function = std::make_shared<jsi::Function>(std::move(function)), weakThis = weak_from_this()]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    strongThis->runSync(*function);
  });
}

void WorkletRuntime::schedule(std::shared_ptr<SerializableWorklet> worklet) const {
  react_native_assert(
      queue_ &&
      "[Worklets] Tried to invoke `schedule` on a Worklet Runtime but the "
      "async queue is not set. Recreate the runtime with a valid async queue.");

  queue_->push([worklet = std::move(worklet), weakThis = weak_from_this()] {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    strongThis->runSync(worklet);
  });
}

void WorkletRuntime::schedule(std::function<void()> job) const {
  react_native_assert(
      queue_ &&
      "[Worklets] Tried to invoke `schedule` on a Worklet Runtime but the "
      "async queue is not set. Recreate the runtime with a valid async queue.");

  queue_->push(std::move(job));
}

void WorkletRuntime::schedule(std::function<void(jsi::Runtime &)> job) const {
  react_native_assert(
      queue_ &&
      "[Worklets] Tried to invoke `schedule` on a Worklet Runtime but the "
      "async queue is not set. Recreate the runtime with a valid async queue.");

  queue_->push([job = std::move(job), weakThis = weak_from_this()]() {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto lock = std::unique_lock<std::recursive_mutex>(*strongThis->runtimeMutex_);
    jsi::Runtime &runtime = strongThis->getJSIRuntime();
    job(runtime);
  });
}

/* #endregion */

jsi::Value WorkletRuntime::get(jsi::Runtime &rt, const jsi::PropNameID &propName) {
  auto name = propName.utf8(rt);
  if (name == "toString") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        0,
        [weakThis = weak_from_this()](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) -> jsi::Value {
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

std::vector<jsi::PropNameID> WorkletRuntime::getPropertyNames(jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> result;
  result.push_back(jsi::PropNameID::forUtf8(rt, "toString"));
  result.push_back(jsi::PropNameID::forUtf8(rt, "name"));
  return result;
}

std::shared_ptr<WorkletRuntime> extractWorkletRuntime(jsi::Runtime &rt, const jsi::Value &value) {
  return value.getObject(rt).getHostObject<WorkletRuntime>(rt);
}

void scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &serializableWorkletValue) {
  auto workletRuntime = extractWorkletRuntime(rt, workletRuntimeValue);
  auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
      rt,
      serializableWorkletValue,
      "[Worklets] Function passed to `_scheduleOnRuntime` is not a serializable worklet.");
  workletRuntime->schedule(serializableWorklet);
}

#if REACT_NATIVE_MINOR_VERSION >= 81
std::weak_ptr<WorkletRuntime> WorkletRuntime::getWeakRuntimeFromJSIRuntime(jsi::Runtime &rt) {
  auto runtimeData = rt.getRuntimeData(RuntimeData::weakRuntimeUUID);
  if (!runtimeData) [[unlikely]] {
    throw std::runtime_error(
        "[Worklets] No weak runtime data found on the provided JSI runtime."
        " Perhaps the JSI Runtime is not a WorkletRuntime?");
  }
  auto weakHolder = std::static_pointer_cast<WeakRuntimeHolder>(runtimeData);
  return weakHolder->weakRuntime;
}
#endif // REACT_NATIVE_MINOR_VERSION >= 81

/* #region deprecated */

void WorkletRuntime::runAsyncGuarded(const std::shared_ptr<SerializableWorklet> &worklet) {
  schedule(worklet);
}

jsi::Value WorkletRuntime::executeSync(jsi::Runtime &caller, const jsi::Value &worklet) const {
  auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
      caller, worklet, "[Worklets] Only worklets can be executed synchronously on UI runtime.");
  auto result = runSyncSerialized(serializableWorklet);
  return result->toJSValue(caller);
}

jsi::Value WorkletRuntime::executeSync(std::function<jsi::Value(jsi::Runtime &)> &&job) const {
  return runSync(job);
}

jsi::Value WorkletRuntime::executeSync(const std::function<jsi::Value(jsi::Runtime &)> &job) const {
  return runSync(job);
}

#ifndef NDEBUG
static const auto callGuardLambda = [](facebook::jsi::Runtime &rt,
                                       const facebook::jsi::Value &thisVal,
                                       const facebook::jsi::Value *args,
                                       size_t count) {
  return args[0].asObject(rt).asFunction(rt).call(rt, args + 1, count - 1);
};

jsi::Function WorkletRuntime::getCallGuard(jsi::Runtime &rt) {
  auto callGuard = rt.global().getProperty(rt, "__callGuardDEV");
  if (callGuard.isObject()) {
    // Use JS implementation if `__callGuardDEV` has already been installed.
    // This is the desired behavior.
    return callGuard.asObject(rt).asFunction(rt);
  }

  // Otherwise, fallback to C++ JSI implementation. This is necessary so that we
  // can install `__callGuardDEV` itself and should happen only once. Note that
  // the C++ implementation doesn't intercept errors and simply throws them as
  // C++ exceptions which crashes the app. We assume that installing the guard
  // doesn't throw any errors.
  return jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "callGuard"), 1, callGuardLambda);
}
#endif // NDEBUG

/* #endregion */

} // namespace worklets
