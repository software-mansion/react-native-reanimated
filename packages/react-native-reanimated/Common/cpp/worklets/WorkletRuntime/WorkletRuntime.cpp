#include <worklets/Tools/JSISerializer.h>
#include <worklets/WorkletRuntime/ReanimatedRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeCollector.h>
#include <worklets/WorkletRuntime/WorkletRuntimeDecorator.h>

#include <jsi/decorator.h>

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

class LockableRuntime : public facebook::jsi::WithRuntimeDecorator<AroundLock> {
  AroundLock aroundLock_;
  std::shared_ptr<facebook::jsi::Runtime> runtime_;

 public:
  explicit LockableRuntime(
      std::shared_ptr<facebook::jsi::Runtime> &runtime,
      const std::shared_ptr<std::recursive_mutex> &runtimeMutex)
      : facebook::jsi::WithRuntimeDecorator<AroundLock>(*runtime, aroundLock_),
        aroundLock_(runtimeMutex),
        runtime_(std::move(runtime)) {}
};

static std::shared_ptr<facebook::jsi::Runtime> makeRuntime(
    facebook::jsi::Runtime &runtime,
    const std::shared_ptr<facebook::react::MessageQueueThread> &jsQueue,
    const std::string &name,
    const bool supportsLocking,
    const std::shared_ptr<std::recursive_mutex> &runtimeMutex) {
  auto reanimatedRuntime = ReanimatedRuntime::make(runtime, jsQueue, name);
  if (supportsLocking) {
    return std::make_shared<LockableRuntime>(reanimatedRuntime, runtimeMutex);
  } else {
    return reanimatedRuntime;
  }
}

WorkletRuntime::WorkletRuntime(
    facebook::jsi::Runtime &rnRuntime,
    const std::shared_ptr<facebook::react::MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::string &name,
    const bool supportsLocking,
    const std::string &valueUnpackerCode)
    : runtimeMutex_(std::make_shared<std::recursive_mutex>()),
      runtime_(makeRuntime(
          rnRuntime,
          jsQueue,
          name,
          supportsLocking,
          runtimeMutex_)),
#ifndef NDEBUG
      supportsLocking_(supportsLocking),
#endif
      name_(name) {
  facebook::jsi::Runtime &rt = *runtime_;
  WorkletRuntimeCollector::install(rt);
  WorkletRuntimeDecorator::decorate(rt, name, jsScheduler);

  auto codeBuffer = std::make_shared<const facebook::jsi::StringBuffer>(
      "(" + valueUnpackerCode + "\n)");
  auto valueUnpacker = rt.evaluateJavaScript(codeBuffer, "valueUnpacker")
                           .asObject(rt)
                           .asFunction(rt);
  rt.global().setProperty(rt, "__valueUnpacker", valueUnpacker);
}

facebook::jsi::Value WorkletRuntime::executeSync(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &worklet) const {
  assert(
      supportsLocking_ &&
      ("[Reanimated] Runtime \"" + name_ + "\" doesn't support locking.")
          .c_str());
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt,
      worklet,
      "[Reanimated] Only worklets can be executed synchronously on UI runtime.");
  auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
  facebook::jsi::Runtime &uiRuntime = getJSIRuntime();
  auto result = runGuarded(shareableWorklet);
  auto shareableResult = extractShareableOrThrow(uiRuntime, result);
  lock.unlock();
  return shareableResult->toJSValue(rt);
}

facebook::jsi::Value WorkletRuntime::get(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::PropNameID &propName) {
  auto name = propName.utf8(rt);
  if (name == "toString") {
    return facebook::jsi::Function::createFromHostFunction(
        rt,
        propName,
        0,
        [this](
            facebook::jsi::Runtime &rt,
            const facebook::jsi::Value &,
            const facebook::jsi::Value *,
            size_t) -> facebook::jsi::Value {
          return facebook::jsi::String::createFromUtf8(rt, toString());
        });
  }
  if (name == "name") {
    return facebook::jsi::String::createFromUtf8(rt, name_);
  }
  return facebook::jsi::Value::undefined();
}

std::vector<facebook::jsi::PropNameID> WorkletRuntime::getPropertyNames(
    facebook::jsi::Runtime &rt) {
  std::vector<facebook::jsi::PropNameID> result;
  result.push_back(facebook::jsi::PropNameID::forUtf8(rt, "toString"));
  result.push_back(facebook::jsi::PropNameID::forUtf8(rt, "name"));
  return result;
}

std::shared_ptr<WorkletRuntime> extractWorkletRuntime(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &value) {
  return value.getObject(rt).getHostObject<WorkletRuntime>(rt);
}

void scheduleOnRuntime(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Value &workletRuntimeValue,
    const facebook::jsi::Value &shareableWorkletValue) {
  auto workletRuntime = extractWorkletRuntime(rt, workletRuntimeValue);
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt,
      shareableWorkletValue,
      "[Reanimated] Function passed to `_scheduleOnRuntime` is not a shareable worklet. Please make sure that `processNestedWorklets` option in Reanimated Babel plugin is enabled.");
  workletRuntime->runAsyncGuarded(shareableWorklet);
}

} // namespace worklets
