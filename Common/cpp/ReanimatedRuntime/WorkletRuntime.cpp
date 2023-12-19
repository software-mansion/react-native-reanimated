#include "WorkletRuntime.h"
#include "JSISerializer.h"
#include "ReanimatedRuntime.h"
#include "WorkletRuntimeCollector.h"
#include "WorkletRuntimeDecorator.h"

#include <jsi/decorator.h>

namespace reanimated {

struct AroundLock {
  std::recursive_mutex *mutex;
  void before() {
    mutex->lock();
  }
  void after() {
    mutex->unlock();
  }
};

class LockableRuntime : public jsi::WithRuntimeDecorator<AroundLock> {
 private:
  AroundLock aroundLock_;
  std::shared_ptr<jsi::Runtime> runtime_;

 public:
  explicit LockableRuntime(
      std::shared_ptr<jsi::Runtime> &&runtime,
      std::recursive_mutex *runtimeMutex)
      : jsi::WithRuntimeDecorator<AroundLock>(*runtime, aroundLock_),
        runtime_(std::move(runtime)) {
    aroundLock_.mutex = runtimeMutex;
  }
};

static std::shared_ptr<jsi::Runtime> makeRuntime(
    jsi::Runtime &runtime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::string &name,
    bool supportLocking,
    std::recursive_mutex *runtimeMutex) {
  if (supportLocking) {
    return std::make_shared<LockableRuntime>(
        ReanimatedRuntime::make(runtime, jsQueue, name), runtimeMutex);
  } else {
    return ReanimatedRuntime::make(runtime, jsQueue, name);
  }
}

WorkletRuntime::WorkletRuntime(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::string &name,
    WorkletRuntimeType type)
    : runtime_(makeRuntime(
          rnRuntime,
          jsQueue,
          name,
          WorkletRuntimeType::WithLocking,
          &runtimeMutex_)),
      name_(name),
      supportsLocking_(type == WorkletRuntimeType::WithLocking) {
  jsi::Runtime &rt = *runtime_;
  WorkletRuntimeCollector::install(rt);
  WorkletRuntimeDecorator::decorate(rt, name, jsScheduler);
}

std::unique_lock<std::recursive_mutex> WorkletRuntime::lock() {
  assert(supportsLocking_ && "Runtime doesn't support locking");
  return std::unique_lock<std::recursive_mutex>(runtimeMutex_);
}

void WorkletRuntime::installValueUnpacker(
    const std::string &valueUnpackerCode) {
  jsi::Runtime &rt = *runtime_;
  auto codeBuffer = std::make_shared<const jsi::StringBuffer>(
      "(" + valueUnpackerCode + "\n)");
  auto valueUnpacker = rt.evaluateJavaScript(codeBuffer, "installValueUnpacker")
                           .asObject(rt)
                           .asFunction(rt);
  rt.global().setProperty(rt, "__valueUnpacker", valueUnpacker);
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
