#include "WorkletRuntime.h"
#include "JSISerializer.h"
#include "ReanimatedRuntime.h"
#include "WorkletRuntimeCollector.h"
#include "WorkletRuntimeDecorator.h"

#include <jsi/decorator.h>

namespace reanimated {

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
    jsi::Runtime &runtime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
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
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
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
  jsi::Runtime &rt = *runtime_;
  WorkletRuntimeCollector::install(rt);
  WorkletRuntimeDecorator::decorate(rt, name, jsScheduler);

  auto codeBuffer = std::make_shared<const jsi::StringBuffer>(
      "(" + valueUnpackerCode + "\n)");
  auto valueUnpacker =
      rt.evaluateJavaScript(codeBuffer, "WorkletRuntime::WorkletRuntime")
          .asObject(rt)
          .asFunction(rt);
  rt.global().setProperty(rt, "__valueUnpacker", valueUnpacker);
}

jsi::Value WorkletRuntime::executeSync(
    jsi::Runtime &rt,
    const jsi::Value &worklet) const {
  assert(
      supportsLocking_ &&
      ("[Reanimated] Runtime \"" + name_ + "\" doesn't support locking.")
          .c_str());
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt,
      worklet,
      "[Reanimated] Only worklets can be executed synchronously on UI runtime.");
  auto lock = std::unique_lock<std::recursive_mutex>(*runtimeMutex_);
  jsi::Runtime &uiRuntime = getJSIRuntime();
  auto result = runGuarded(shareableWorklet);
  auto shareableResult = extractShareableOrThrow(uiRuntime, result);
  lock.unlock();
  return shareableResult->getJSValue(rt);
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
        [this](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t)
            -> jsi::Value {
          return jsi::String::createFromUtf8(rt, toString());
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
      "[Reanimated] Function passed to `_scheduleOnRuntime` is not a shareable worklet. Please make sure that `processNestedWorklets` option in Reanimated Babel plugin is enabled.");
  workletRuntime->runAsyncGuarded(shareableWorklet);
}

} // namespace reanimated
