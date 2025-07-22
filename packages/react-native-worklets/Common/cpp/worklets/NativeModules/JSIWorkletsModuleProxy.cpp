#include <react/renderer/uimanager/UIManagerBinding.h>
#include <react/renderer/uimanager/primitives.h>

#include <worklets/NativeModules/JSIWorkletsModuleProxy.h>
#include <worklets/NativeModules/WorkletsModuleProxy.h>
#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/Defs.h>
#include <worklets/Tools/FeatureFlags.h>
#include <worklets/Tools/JSLogger.h>
#include <worklets/WorkletRuntime/UIRuntimeDecorator.h>

#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#endif // __ANDROID__

using namespace facebook;

namespace worklets {

inline void scheduleOnUI(
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::weak_ptr<WorkletRuntime> &weakUIWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  auto shareableWorklet = extractShareableOrThrow<ShareableWorklet>(
      rt, worklet, "[Worklets] Only worklets can be scheduled to run on UI.");
  uiScheduler->scheduleOnUI([shareableWorklet, weakUIWorkletRuntime]() {
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
    const std::weak_ptr<WorkletRuntime> &weakUIWorkletRuntime,
    jsi::Runtime &rt,
    const jsi::Value &worklet) {
  if (auto uiWorkletRuntime = weakUIWorkletRuntime.lock()) {
    return uiWorkletRuntime->executeSync(rt, worklet);
  }
  return jsi::Value::undefined();
}

inline jsi::Value createWorkletRuntime(
    jsi::Runtime &originRuntime,
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    std::shared_ptr<JSIWorkletsModuleProxy> jsiWorkletsModuleProxy,
    const std::string &name,
    std::shared_ptr<ShareableWorklet> &initializer) {
  const auto workletRuntime = runtimeManager->createWorkletRuntime(
      jsiWorkletsModuleProxy, true /* supportsLocking */, name, initializer);
  return jsi::Object::createFromHostObject(originRuntime, workletRuntime);
}

#ifdef WORKLETS_BUNDLE_MODE
inline jsi::Value propagateModuleUpdate(
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::string &code,
    const std::string &sourceUrl) {
  const auto runtimes = runtimeManager->getAllRuntimes();

  for (auto runtime : runtimes) {
    runtime->executeSync([code, sourceUrl](jsi::Runtime &rt) {
      const auto buffer = std::make_shared<jsi::StringBuffer>(code);
      rt.evaluateJavaScript(buffer, sourceUrl);
      return jsi::Value::undefined();
    });
  }
  return jsi::Value::undefined();
}
#endif // WORKLETS_BUNDLE_MODE

inline jsi::Value reportFatalErrorOnJS(
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::string &message,
    const std::string &stack,
    const std::string &name,
    const std::string &jsEngine) {
  JSLogger::reportFatalErrorOnJS(
      jsScheduler,
      JSErrorData{
          .message = message,
          .stack = stack,
          .name = name,
          .jsEngine = jsEngine});
  return jsi::Value::undefined();
}

JSIWorkletsModuleProxy::JSIWorkletsModuleProxy(
    const bool isDevBundle,
    const std::shared_ptr<const BigStringBuffer> &script,
    const std::string &sourceUrl,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::shared_ptr<UIScheduler> &uiScheduler,
    const std::shared_ptr<RuntimeManager> &runtimeManager,
    const std::weak_ptr<WorkletRuntime> &uiWorkletRuntime)
    : jsi::HostObject(),
      isDevBundle_(isDevBundle),
      script_(script),
      sourceUrl_(sourceUrl),
      jsQueue_(jsQueue),
      jsScheduler_(jsScheduler),
      uiScheduler_(uiScheduler),
      runtimeManager_(runtimeManager),
      uiWorkletRuntime_(uiWorkletRuntime) {}

JSIWorkletsModuleProxy::JSIWorkletsModuleProxy(
    const JSIWorkletsModuleProxy &other)
    : jsi::HostObject(),
      isDevBundle_(other.isDevBundle_),
      script_(other.script_),
      sourceUrl_(other.sourceUrl_),
      jsQueue_(other.jsQueue_),
      jsScheduler_(other.jsScheduler_),
      uiScheduler_(other.uiScheduler_),
      runtimeManager_(other.runtimeManager_),
      uiWorkletRuntime_(other.uiWorkletRuntime_) {}

JSIWorkletsModuleProxy::~JSIWorkletsModuleProxy() = default;

std::vector<jsi::PropNameID> JSIWorkletsModuleProxy::getPropertyNames(
    jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> propertyNames;

  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableClone"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableBigInt"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableBoolean"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableImport"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableNull"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableNumber"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableString"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableUndefined"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableHostObject"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableInitializer"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableArray"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableFunction"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableTurboModuleLike"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableObject"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "makeShareableMap"));
  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "makeShareableSet"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "makeShareableWorklet"));

  propertyNames.emplace_back(jsi::PropNameID::forAscii(rt, "scheduleOnUI"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "executeOnUIRuntimeSync"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "createWorkletRuntime"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "scheduleOnRuntime"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "reportFatalErrorOnJS"));
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "setDynamicFeatureFlag"));

#ifdef WORKLETS_BUNDLE_MODE
  propertyNames.emplace_back(
      jsi::PropNameID::forAscii(rt, "propagateModuleUpdate"));
#endif // WORKLETS_BUNDLE_MODE

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

  if (name == "makeShareableBigInt") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableBigInt(rt, args[0].asBigInt(rt));
        });
  }

  if (name == "makeShareableBoolean") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableBoolean(rt, args[0].asBool());
        });
  }

  if (name == "makeShareableImport") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableImport(
              rt, args[0].asNumber(), args[1].asString(rt));
        });
  }

  if (name == "makeShareableNumber") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableNumber(rt, args[0].asNumber());
        });
  }

  if (name == "makeShareableNull") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        0,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) { return makeShareableNull(rt); });
  }

  if (name == "makeShareableString") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableString(rt, args[0].asString(rt));
        });
  }

  if (name == "makeShareableUndefined") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        0,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) { return makeShareableUndefined(rt); });
  }

  if (name == "makeShareableInitializer") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableInitializer(rt, args[0].asObject(rt));
        });
  }

  if (name == "makeShareableArray") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableArray(
              rt, args[0].asObject(rt).asArray(rt), args[1]);
        });
  }

  if (name == "makeShareableMap") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableMap(
              rt,
              args[0].asObject(rt).asArray(rt),
              args[1].asObject(rt).asArray(rt));
        });
  }

  if (name == "makeShareableSet") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableSet(rt, args[0].asObject(rt).asArray(rt));
        });
  }

  if (name == "makeShareableHostObject") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableHostObject(
              rt, args[0].asObject(rt).asHostObject(rt));
        });
  }

  if (name == "makeShareableFunction") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableFunction(rt, args[0].asObject(rt).asFunction(rt));
        });
  }

  if (name == "makeShareableTurboModuleLike") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableTurboModuleLike(
              rt, args[0].asObject(rt), args[1].asObject(rt).asHostObject(rt));
        });
  }

  if (name == "makeShareableObject") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        1,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableObject(
              rt, args[0].getObject(rt), args[1].getBool(), args[2]);
        });
  }

  if (name == "makeShareableWorklet") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          return makeShareableWorklet(
              rt, args[0].getObject(rt), args[1].getBool());
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
  }

  if (name == "executeOnUIRuntimeSync") {
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
  }

  if (name == "createWorkletRuntime") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [clone = std::make_shared<JSIWorkletsModuleProxy>(*this)](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count) {
          auto name = args[0].asString(rt).utf8(rt);
          auto shareableInitializer = extractShareableOrThrow<ShareableWorklet>(
              rt, args[1], "[Worklets] Initializer must be a worklet.");

          return createWorkletRuntime(
              rt,
              clone->getRuntimeManager(),
              clone->getJSQueue(),
              clone,
              name,
              shareableInitializer);
        });
  }

  if (name == "scheduleOnRuntime") {
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

  if (name == "reportFatalErrorOnJS") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        4,
        [jsScheduler = jsScheduler_](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count) {
          return reportFatalErrorOnJS(
              jsScheduler,
              /* message */ args[0].asString(rt).utf8(rt),
              /* stack */ args[1].asString(rt).utf8(rt),
              /* name */ args[2].asString(rt).utf8(rt),
              /* jsEngine */ args[3].asString(rt).utf8(rt));
        });
  }

#ifdef WORKLETS_BUNDLE_MODE
  if (name == "propagateModuleUpdate") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [runtimeManager = runtimeManager_](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count) {
          return propagateModuleUpdate(
              runtimeManager,
              /* code */ args[0].asString(rt).utf8(rt),
              /* sourceURL */ args[1].asString(rt).utf8(rt));
        });
  }
#endif // WORKLETS_BUNDLE_MODE

  if (name == "setDynamicFeatureFlag") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        2,
        [](jsi::Runtime &rt,
           const jsi::Value &thisValue,
           const jsi::Value *args,
           size_t count) {
          DynamicFeatureFlags::setFlag(
              /* name */ args[0].asString(rt).utf8(rt),
              /* value */ args[1].asBool());
          return jsi::Value::undefined();
        });
  }

  return jsi::Value::undefined();
}

} // namespace worklets
