#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/Tools/JSISerializer.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/WorkletRuntime/RuntimeHolder.h>
#include <worklets/WorkletRuntime/WorkletHermesRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>
#include <worklets/WorkletRuntime/WorkletRuntimeDecorator.h>
#include <worklets/WorkletRuntime/WorkletRuntimeInspectorTarget.h>

#include <jsi/decorator.h>
#include <jsi/jsi.h>

#include <future>
#include <memory>
#include <string>
#include <utility>
#include <vector>

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

static std::shared_ptr<jsi::Runtime> makeRuntime(const std::shared_ptr<std::recursive_mutex> &runtimeMutex) {
  auto hermesRuntime = facebook::hermes::makeHermesRuntime(
      ::hermes::vm::RuntimeConfig::Builder()
          .withEnableSampleProfiling(true)
          .build());
  std::shared_ptr<jsi::Runtime> jsiRuntime = std::make_shared<WorkletHermesRuntime>(std::move(hermesRuntime));
  return std::make_shared<LockableRuntime>(jsiRuntime, runtimeMutex);
}

// Creates the runtime on the queue's execution thread. The Hermes sampling
// profiler registers the creating thread as the runtime thread, so the runtime
// must be created on the same thread that will later execute JS on it.
// If no queue is provided the runtime is created on the calling thread.
static std::shared_ptr<jsi::Runtime> makeRuntimeOnQueue(
    const std::shared_ptr<AsyncQueue> &queue,
    const std::shared_ptr<std::recursive_mutex> &runtimeMutex) {
  if (!queue) {
    return makeRuntime(runtimeMutex);
  }

  std::shared_ptr<jsi::Runtime> runtime;
  auto promise = std::make_shared<std::promise<void>>();
  auto future = promise->get_future();

  queue->push([&runtime, &runtimeMutex, promise]() {
    runtime = makeRuntime(runtimeMutex);
    promise->set_value();
  });

  future.get();
  return runtime;
}

WorkletRuntime::WorkletRuntime(
    uint64_t runtimeId,
    const std::string &name,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop)
    : runtimeId_(runtimeId),
      runtimeMutex_(std::make_shared<std::recursive_mutex>()),
      runtime_(makeRuntimeOnQueue(queue, runtimeMutex_)),
      name_(name),
      queue_(queue) {
  jsi::Runtime &rt = *runtime_;
  WorkletRuntimeCollector::install(rt);
  if (enableEventLoop) {
    eventLoop_ = std::make_shared<EventLoop>(name_, runtime_, queue_);
    eventLoop_->run();
  }

#if JS_RUNTIME_HERMES
  if (queue_ != nullptr) {
    // Cast through LockableRuntime (defined above in this file) to reach the
    // underlying WorkletHermesRuntime and its bare HermesRuntime reference.
    // Both casts are safe: we constructed the runtimes ourselves in makeRuntime().
    auto &workletHermes =
        static_cast<WorkletHermesRuntime &>(static_cast<LockableRuntime &>(*runtime_).plain());

    // Build a RuntimeExecutor that schedules work on the worklet serial queue.
    // We capture the queue and runtime shared_ptrs directly rather than using
    // weak_from_this(), because enable_shared_from_this::weak_this_ is not
    // yet wired up during the constructor body.
    // HermesRuntimeAgentDelegate ignores the jsi::Runtime& parameter it
    // receives — it captures its own HermesRuntime& reference — so passing
    // the LockableRuntime back is safe.
    auto runtimeExecutor = [queue = queue_,
                             weakRuntime = std::weak_ptr<jsi::Runtime>(runtime_),
                             runtimeMutex = runtimeMutex_](std::function<void(jsi::Runtime &)> &&callback) {
      queue->push([callback = std::move(callback), weakRuntime, runtimeMutex]() {
        auto runtime = weakRuntime.lock();
        if (!runtime) {
          return;
        }
        auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex);
        callback(*runtime);
      });
    };

    // runtime_ (LockableRuntime shared_ptr) transitively keeps HermesRuntime
    // alive, satisfying the lifetime requirement of HermesRuntimeTargetDelegate.
    inspectorTarget_ = std::make_unique<WorkletRuntimeInspectorTarget>(
        name_,
        runtime_,
        workletHermes.getHermesRuntime(),
        std::move(runtimeExecutor));
  }
#endif // JS_RUNTIME_HERMES
}

WorkletRuntime::~WorkletRuntime() = default;

void WorkletRuntime::init(const std::shared_ptr<JSIWorkletsModuleProxy> &jsiWorkletsModuleProxy) {
  jsi::Runtime &rt = *runtime_;

  rt.setRuntimeData(
      RuntimeData::weakRuntimeUUID,
      std::make_shared<WeakRuntimeHolder>(WeakRuntimeHolder{.weakRuntime = weak_from_this()}));

  const auto jsScheduler = jsiWorkletsModuleProxy->getJSScheduler();
  jsScheduler_ = jsScheduler;
  const auto isDevBundle = jsiWorkletsModuleProxy->isDevBundle();
  const auto memoryManager_ = jsiWorkletsModuleProxy->getMemoryManager();
  const auto script = jsiWorkletsModuleProxy->getScript();
  const auto &sourceUrl = jsiWorkletsModuleProxy->getSourceUrl();
  const auto runtimeBindings = jsiWorkletsModuleProxy->getRuntimeBindings();
  const auto bundleModeEnabled = jsiWorkletsModuleProxy->isBundleModeEnabled();
  const auto unpackerLoader = jsiWorkletsModuleProxy->getUnpackerLoader();
  const auto &nativeLoggingHook = runtimeBindings->nativeLoggingHook;
  WorkletRuntimeDecorator::decorate(
      rt,
      name_,
      jsScheduler,
      isDevBundle,
      jsiWorkletsModuleProxy->toOptimizedObject(rt),
      eventLoop_,
      nativeLoggingHook);

  if (bundleModeEnabled) {
    bundleModeInit(jsScheduler, script, sourceUrl, runtimeBindings);
  } else {
    legacyModeInit(unpackerLoader);
  }

  try {
    memoryManager_->loadAllCustomSerializables(shared_from_this());
  } catch (jsi::JSError &e) {
    throw std::runtime_error(std::string("[Worklets] Failed to load custom serializables. Reason: ") + e.getMessage());
  }
}

void WorkletRuntime::bundleModeInit(
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<const ScriptBuffer> &script,
    const std::string &sourceUrl,
    const std::shared_ptr<RuntimeBindings> &runtimeBindings) {
  jsi::Runtime &rt = *runtime_;

  if (!script) {
    throw std::runtime_error("[Worklets] Expected to receive the bundle, but got nullptr instead.");
  }

  try {
    rt.evaluateJavaScript(script, sourceUrl);
  } catch (facebook::jsi::JSError &error) {
    const auto &message = error.getMessage();
    const auto &stack = error.getStack();
    if (!message.starts_with("[Worklets] Worklets initialized successfully")) {
      const auto newMessage = "[Worklets] Failed to initialize runtime. Reason: " + message + " " + stack;
      JSLogger::reportFatalErrorOnJS(jsScheduler, {.message = newMessage, .stack = stack, .name = "WorkletsError"});
      return;
    }
  }

  WorkletRuntimeDecorator::postEvaluateScript(rt, runtimeBindings);
}

void WorkletRuntime::legacyModeInit(const std::shared_ptr<UnpackerLoader> &unpackerLoader) {
  unpackerLoader->installUnpackers(*runtime_);
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

#ifndef NDEBUG
void WorkletRuntime::schedule(std::shared_ptr<SerializableWorklet> worklet, std::optional<std::string> scheduleStack)
    const {
  react_native_assert(
      queue_ &&
      "[Worklets] Tried to invoke `schedule` on a Worklet Runtime but the "
      "async queue is not set. Recreate the runtime with a valid async queue.");

  queue_->push([worklet = std::move(worklet), scheduleStack = std::move(scheduleStack), weakThis = weak_from_this()] {
    auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    strongThis->runSyncWithStack(worklet, scheduleStack);
  });
}
#endif // NDEBUG

void WorkletRuntime::callMicrotasks() const {
  runSync([](jsi::Runtime &rt) {
    auto callMicrotasks = rt.global().getProperty(rt, "__callMicrotasks");
    if (callMicrotasks.isObject()) {
      auto callMicrotasksObject = callMicrotasks.asObject(rt);
      if (callMicrotasksObject.isFunction(rt)) {
        callMicrotasksObject.asFunction(rt).call(rt);
      }
    }
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
  if (name == "runtimeId") {
    return jsi::Value(static_cast<double>(runtimeId_));
  }
  return jsi::Value::undefined();
}

std::vector<jsi::PropNameID> WorkletRuntime::getPropertyNames(jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> result;
  result.push_back(jsi::PropNameID::forUtf8(rt, "toString"));
  result.push_back(jsi::PropNameID::forUtf8(rt, "name"));
  result.push_back(jsi::PropNameID::forUtf8(rt, "runtimeId"));
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

#ifndef NDEBUG
void scheduleOnRuntime(
    jsi::Runtime &rt,
    const jsi::Value &workletRuntimeValue,
    const jsi::Value &serializableWorkletValue,
    const std::optional<std::string> &scheduleStack) {
  auto workletRuntime = extractWorkletRuntime(rt, workletRuntimeValue);
  auto serializableWorklet = extractSerializableOrThrow<SerializableWorklet>(
      rt,
      serializableWorkletValue,
      "[Worklets] Function passed to `_scheduleOnRuntime` is not a serializable worklet.");
  workletRuntime->schedule(serializableWorklet, scheduleStack);
}
#endif // NDEBUG

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

/* #endregion */

} // namespace worklets
