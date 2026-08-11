#include <jsi/decorator.h>
#include <jsi/jsi.h>
#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/WorkletRuntime/RuntimeHolder.h>
#include <worklets/WorkletRuntime/ScriptLoader.h>
#include <worklets/WorkletRuntime/WorkletHermesRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>
#include <worklets/WorkletRuntime/WorkletRuntimeDecorator.h>

#include <memory>
#include <stdexcept>
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

static std::shared_ptr<jsi::Runtime>
makeRuntime(const std::shared_ptr<std::recursive_mutex> &runtimeMutex, bool enableLocking, bool enableMicrotaskQueue) {
  auto config = ::hermes::vm::RuntimeConfig::Builder().withMicrotaskQueue(enableMicrotaskQueue).build();
  auto hermesRuntime = facebook::hermes::makeHermesRuntime(config);
  std::shared_ptr<jsi::Runtime> jsiRuntime = std::make_shared<WorkletHermesRuntime>(std::move(hermesRuntime));
  if (!enableLocking) {
    return jsiRuntime;
  }
  return std::make_shared<LockableRuntime>(jsiRuntime, runtimeMutex);
}

WorkletRuntime::WorkletRuntime(
    uint64_t runtimeId,
    const RuntimeData::RuntimeKind runtimeKind,
    const std::string &name,
    const std::shared_ptr<AsyncQueue> &queue,
    bool enableEventLoop,
    bool enableLocking)
    : runtimeId_(runtimeId),
      enableLocking_(enableLocking),
      runtimeMutex_(std::make_shared<std::recursive_mutex>()),
      microtaskQueueEnabled_(enableEventLoop || runtimeKind == RuntimeData::RuntimeKind::UI),
      runtime_(makeRuntime(runtimeMutex_, enableLocking_, microtaskQueueEnabled_)),
      runtimeKind_(runtimeKind),
      name_(name),
      queue_(queue) {
  react_native_assert(
      (enableLocking || !enableEventLoop) &&
      "[Worklets] The Event Loop cannot be enabled on a Worklet Runtime with "
      "locking disabled.");
  jsi::Runtime &rt = *runtime_;
  WorkletRuntimeCollector::install(rt);
  if (enableEventLoop) {
    eventLoop_ = std::make_shared<EventLoop>(name_, runtime_, queue_, runtimeMutex_);
    eventLoop_->run();
  }
}

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
      runtimeKind_,
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

  ScriptLoader::loadScript(rt, script, sourceUrl);

  WorkletRuntimeDecorator::postEvaluateScript(rt, runtimeBindings);
}

void WorkletRuntime::legacyModeInit(const std::shared_ptr<UnpackerLoader> &unpackerLoader) {
  unpackerLoader->installUnpackers(*runtime_);
}

/* #region schedule */

void WorkletRuntime::schedule(jsi::Function &&function) const {
  scheduleImpl([function = std::make_shared<jsi::Function>(std::move(function))](const WorkletRuntime &workletRuntime) {
    workletRuntime.runSyncImpl<MicrotaskCheckpoint::Run>(*function);
  });
}

void WorkletRuntime::schedule(std::shared_ptr<SerializableWorklet> worklet) const {
  scheduleImpl([worklet = std::move(worklet)](const WorkletRuntime &workletRuntime) {
    workletRuntime.runSyncImpl<MicrotaskCheckpoint::Run>(worklet);
  });
}

void WorkletRuntime::schedule(std::vector<std::shared_ptr<SerializableWorklet>> worklets) const {
  scheduleImpl([worklets = std::move(worklets)](const WorkletRuntime &workletRuntime) {
    workletRuntime.runSyncImpl<MicrotaskCheckpoint::Run>([&](jsi::Runtime &rt) {
      const auto scope = jsi::Scope(rt);
      for (const auto &worklet : worklets) {
        workletRuntime.runSyncImpl(worklet);
      }
    });
  });
}

#ifndef NDEBUG
void WorkletRuntime::scheduleWithStack(
    std::shared_ptr<SerializableWorklet> worklet,
    std::optional<std::string> scheduleStack) const {
  scheduleImpl([worklet = std::move(worklet),
                scheduleStack = std::move(scheduleStack)](const WorkletRuntime &workletRuntime) {
    workletRuntime.runSyncImpl<MicrotaskCheckpoint::Run, jsi::Value, ScheduleStack::Requested>(worklet, scheduleStack);
  });
}

void WorkletRuntime::scheduleWithStack(
    std::vector<std::shared_ptr<SerializableWorklet>> worklets,
    std::vector<std::optional<std::string>> scheduleStacks) const {
  react_native_assert(worklets.size() == scheduleStacks.size());
  scheduleImpl([worklets = std::move(worklets),
                scheduleStacks = std::move(scheduleStacks)](const WorkletRuntime &workletRuntime) {
    workletRuntime.runSyncImpl<MicrotaskCheckpoint::Run>([&](jsi::Runtime &rt) {
      const auto scope = jsi::Scope(rt);
      for (size_t i = 0; i < worklets.size(); i++) {
        workletRuntime.runSyncImpl<MicrotaskCheckpoint::Skip, jsi::Value, ScheduleStack::Requested>(
            worklets[i], scheduleStacks[i]);
      }
    });
  });
}
#endif // NDEBUG

void WorkletRuntime::schedule(std::function<void(jsi::Runtime &)> job) const {
  scheduleImpl([job = std::move(job)](const WorkletRuntime &workletRuntime) {
    workletRuntime.runSyncImpl<MicrotaskCheckpoint::Run>(job);
  });
}

void WorkletRuntime::scheduleImpl(ScheduledJob job) const {
  react_native_assert(
      queue_ &&
      "[Worklets] Tried to invoke `schedule` on a Worklet Runtime but the "
      "async queue is not set. Recreate the runtime with a valid async queue.");

  queue_->push([job = std::move(job), weakThis = weak_from_this()] {
    const auto strongThis = weakThis.lock();
    if (!strongThis) {
      return;
    }

    auto lock = strongThis->acquireRuntimeLock();
    job(*strongThis);
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
  workletRuntime->scheduleWithStack(serializableWorklet, scheduleStack);
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

} // namespace worklets
