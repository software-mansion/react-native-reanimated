#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>

#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/Defs.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

#include <jsi/jsi.h>

#include <string>
#include <utility>

using namespace facebook;

namespace worklets {

inline void scheduleOnUI(
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::shared_ptr<WorkletRuntime> &uiWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt, worklet, "[Worklets] Only worklets can be scheduled to run on UI.");
  uiScheduler->scheduleOnUI(
      [shareableWorklet,
       weakUIWorkletRuntime =
           std::weak_ptr<WorkletRuntime>(uiWorkletRuntime)]() {
        // This callback can outlive the WorkletsModuleProxy object during the
        // invalidation of React Native. This happens when WorkletsModuleProxy
        // destructor is called on the JS thread and the UI thread is
        // executing callbacks from the `scheduleOnUI` queue. Therefore, we
        // need to make sure it's still alive before we try to access it.
        auto uiWorkletRuntime = weakUIWorkletRuntime.lock();
        if (!uiWorkletRuntime) {
          return;
        }

#if JS_RUNTIME_HERMES
        // JSI's scope defined here allows for JSI-objects to be cleared up
        // after each runtime loop. Within these loops we typically create
        // some temporary JSI objects and hence it allows for such objects to
        // be garbage collected much sooner. Apparently the scope API is only
        // supported on Hermes at the moment.
        const auto scope = jsi::Scope(uiWorkletRuntime->getJSIRuntime());
#endif // JS_RUNTIME_HERMES

        uiWorkletRuntime->runGuarded(shareableWorklet);
      });
}

inline jsi::Value executeOnUIRuntimeSync(
    const std::shared_ptr<WorkletRuntime> &uiWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  return uiWorkletRuntime->executeSync(rt, worklet);
}

inline jsi::Value createWorkletRuntime(
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
    jsi::Runtime &rt,
    const jsi::Value &name,
    const jsi::Value &initializer) {
  auto workletRuntime = std::make_shared<WorkletRuntime>(
      rt,
      std::move(jsiWorkletsModuleProxy),
      jsQueue,
      jsScheduler,
      name.asString(rt).utf8(rt),
      true /* supportsLocking */);
  auto initializerShareable = extractShareableOrThrow<ShareableWorklet>(
      rt, initializer, "[Worklets] Initializer must be a worklet.");
  workletRuntime->runGuarded(initializerShareable);
  return jsi::Object::createFromHostObject(rt, workletRuntime);
}

JSIWorkletsModuleProxy::JSIWorkletsModuleProxy(
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    std::shared_ptr<WorkletRuntime> uiWorkletRuntime)
    : jsi::HostObject(),
      jsQueue_(jsQueue),
      jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      uiWorkletRuntime_(uiWorkletRuntime) {}

JSIWorkletsModuleProxy::JSIWorkletsModuleProxy(
    const JSIWorkletsModuleProxy &other)
    : jsi::HostObject(),
      jsQueue_(other.jsQueue_),
      jsScheduler_(other.jsScheduler_),
      uiScheduler_(other.uiScheduler_),
      uiWorkletRuntime_(other.uiWorkletRuntime_) {}

JSIWorkletsModuleProxy::~JSIWorkletsModuleProxy() = default;

std::vector<jsi::PropNameID> JSIWorkletsModuleProxy::getPropertyNames(
    jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> propertyNames;

  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableClone"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "scheduleOnUI"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "executeOnUIRuntimeSync"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "createWorkletRuntime"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "scheduleOnRuntime"));

  return propertyNames;
}

jsi::Value JSIWorkletsModuleProxy::get(
    jsi::Runtime &rt,
    const jsi::PropNameID &propName) {
  const auto name = propName.utf8(rt);
  if (name == "makeShareableClone") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        3,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableClone(rt, args[0], args[1], args[2]);
        });
  }
  if (name == "scheduleOnUI") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [uiScheduler = uiScheduler_, uiWorkletRuntime = uiWorkletRuntime_](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count) {
          scheduleOnUI(uiScheduler, uiWorkletRuntime, rt, args[0]);
          return jsi::Value::undefined();
        });
  } else if (name == "executeOnUIRuntimeSync") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [uiWorkletRuntime = uiWorkletRuntime_](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count) {
          return executeOnUIRuntimeSync(uiWorkletRuntime, rt, args[0]);
        });
  } else if (name == "createWorkletRuntime") {
    auto clone = std::make_shared<JSIWorkletsModuleProxy>(*this);
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [jsQueue = jsQueue_, jsScheduler = jsScheduler_, clone](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count) {
          return createWorkletRuntime(
              jsQueue, jsScheduler, std::move(clone), rt, args[0], args[1]);
          return jsi::Value::undefined();
        });
  } else if (name == "scheduleOnRuntime") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [](jsi::Runtime &rt,
           const jsi ::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          worklets::scheduleOnRuntime(rt, args[0], args[1]);
          return jsi::Value::undefined();
        });
  }

  return jsi::Value::undefined();
}

} // namespace worklets
