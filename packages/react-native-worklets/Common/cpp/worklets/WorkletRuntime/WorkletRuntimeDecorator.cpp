#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/JSISerializer.h>
#include <worklets/Tools/PlatformLogger.h>
#include <worklets/Tools/WorkletsJSIUtils.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeDecorator.h>

#include <utility>
#include <vector>

namespace worklets {

static inline double performanceNow() {
  // copied from JSExecutor.cpp
  auto time = std::chrono::steady_clock::now();
  auto duration = std::chrono::duration_cast<std::chrono::nanoseconds>(
                      time.time_since_epoch())
                      .count();

  constexpr double NANOSECONDS_IN_MILLISECOND = 1000000.0;
  return duration / NANOSECONDS_IN_MILLISECOND;
}

static inline std::vector<jsi::Value> parseArgs(
    jsi::Runtime &rt,
    std::shared_ptr<ShareableArray> shareableArgs) {
  if (shareableArgs == nullptr) {
    return {};
  }

  auto argsArray = shareableArgs->toJSValue(rt).asObject(rt).asArray(rt);
  auto argsSize = argsArray.size(rt);
  std::vector<jsi::Value> result(argsSize);
  for (size_t i = 0; i < argsSize; i++) {
    result[i] = argsArray.getValueAtIndex(rt, i);
  }
  return result;
}

void WorkletRuntimeDecorator::decorate(
    jsi::Runtime &rt,
    const std::string &name,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const bool isDevBundle,
    jsi::Object &&jsiWorkletsModuleProxy) {
  // resolves "ReferenceError: Property 'global' doesn't exist at ..."
  rt.global().setProperty(rt, "global", rt.global());

  rt.global().setProperty(rt, "_WORKLET", true);

  rt.global().setProperty(rt, "_LABEL", jsi::String::createFromAscii(rt, name));

  // TODO: Remove _IS_FABRIC sometime in the future
  // react-native-screens 4.9.0 depends on it
  rt.global().setProperty(rt, "_IS_FABRIC", true);

  rt.global().setProperty(rt, "__DEV__", isDevBundle);

  rt.global().setProperty(
      rt, "__workletsModuleProxy", std::move(jsiWorkletsModuleProxy));

#ifndef NDEBUG
  auto evalWithSourceUrl = [](jsi::Runtime &rt,
                              const jsi::Value &thisValue,
                              const jsi::Value *args,
                              size_t count) -> jsi::Value {
    auto code = std::make_shared<const jsi::StringBuffer>(
        args[0].asString(rt).utf8(rt));
    std::string url;
    if (count > 1 && args[1].isString()) {
      url = args[1].asString(rt).utf8(rt);
    }
    return rt.evaluateJavaScript(code, url);
  };
  rt.global().setProperty(
      rt,
      "evalWithSourceUrl",
      jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forAscii(rt, "evalWithSourceUrl"),
          1,
          evalWithSourceUrl));
#endif // NDEBUG

  jsi_utils::installJsiFunction(
      rt, "_log", [](jsi::Runtime &rt, const jsi::Value &value) {
        PlatformLogger::log(stringifyJSIValue(rt, value));
      });

  jsi_utils::installJsiFunction(
      rt, "_toString", [](jsi::Runtime &rt, const jsi::Value &value) {
        return jsi::String::createFromUtf8(rt, stringifyJSIValue(rt, value));
      });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableClone",
      [](jsi::Runtime &rt,
         const jsi::Value &value,
         const jsi::Value &nativeStateSource) {
        auto shouldRetainRemote = jsi::Value::undefined();
        return makeShareableClone(
            rt, value, shouldRetainRemote, nativeStateSource);
      });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableHostObject",
      [](jsi::Runtime &rt, const jsi::Value &value) {
        return makeShareableHostObject(rt, value.asObject(rt).asHostObject(rt));
      });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableString",
      [](jsi::Runtime &rt, const jsi::Value &value) {
        return makeShareableString(rt, value.asString(rt));
      });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableNumber",
      [](jsi::Runtime &rt, const jsi::Value &value) {
        return makeShareableNumber(rt, value.asNumber());
      });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableBoolean",
      [](jsi::Runtime &rt, const jsi::Value &value) {
        return makeShareableBoolean(rt, value.asBool());
      });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableBigInt",
      [](jsi::Runtime &rt, const jsi::Value &value) {
        return makeShareableBigInt(rt, value.asBigInt(rt));
      });

  jsi_utils::installJsiFunction(
      rt, "_makeShareableUndefined", [](jsi::Runtime &rt) {
        return makeShareableUndefined(rt);
      });

  jsi_utils::installJsiFunction(
      rt, "_makeShareableArray", [](jsi::Runtime &rt, const jsi::Value &value) {
        return makeShareableArray(rt, value.asObject(rt).asArray(rt), false);
      });

  jsi_utils::installJsiFunction(rt, "_makeShareableNull", [](jsi::Runtime &rt) {
    return makeShareableNull(rt);
  });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableObject",
      [](jsi::Runtime &rt,
         const jsi::Value &value,
         const jsi::Value &shouldRetainRemote,
         const jsi::Value &nativeStateSource) {
        return makeShareableObject(
            rt,
            value.getObject(rt),
            shouldRetainRemote.getBool(),
            nativeStateSource);
      });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableWorklet",
      [](jsi::Runtime &rt, const jsi::Value &value) {
        return makeShareableWorklet(rt, value.asObject(rt), false);
      });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableInitializer",
      [](jsi::Runtime &rt, const jsi::Value &value) {
        return makeShareableInitializer(rt, value.asObject(rt));
      });

  jsi_utils::installJsiFunction(
      rt,
      "_makeShareableFunction",
      [](jsi::Runtime &rt, const jsi::Value &value) {
        return makeShareableFunction(rt, value.asObject(rt).asFunction(rt));
      });

  jsi_utils::installJsiFunction(
      rt,
      "_scheduleRemoteFunctionOnJS",
      [jsScheduler](
          jsi::Runtime &rt,
          const jsi::Value &funValue,
          const jsi::Value &argsValue) {
        auto shareableRemoteFun = extractShareableOrThrow<
            ShareableRemoteFunction>(
            rt,
            funValue,
            "[Worklets] Incompatible object passed to scheduleOnJS. It is only allowed to schedule worklets or functions defined on the React Native JS runtime this way.");

        auto shareableArgs = argsValue.isUndefined()
            ? nullptr
            : extractShareableOrThrow<ShareableArray>(
                  rt, argsValue, "[Worklets] Args must be an array.");

        jsScheduler->scheduleOnJS([=](jsi::Runtime &rt) {
          auto fun =
              shareableRemoteFun->toJSValue(rt).asObject(rt).asFunction(rt);
          if (shareableArgs == nullptr) {
            // fast path for remote function w/o arguments
            fun.call(rt);
          } else {
            auto args = parseArgs(rt, shareableArgs);
            fun.call(
                rt, const_cast<const jsi::Value *>(args.data()), args.size());
          }
        });
      });

  jsi_utils::installJsiFunction(
      rt,
      "_scheduleHostFunctionOnJS",
      [jsScheduler](
          jsi::Runtime &rt,
          const jsi::Value &hostFunValue,
          const jsi::Value &argsValue) {
        auto hostFun =
            hostFunValue.asObject(rt).asFunction(rt).getHostFunction(rt);

        auto shareableArgs = argsValue.isUndefined()
            ? nullptr
            : extractShareableOrThrow<ShareableArray>(
                  rt, argsValue, "[Worklets] Args must be an array.");

        jsScheduler->scheduleOnJS([=](jsi::Runtime &rt) {
          auto args = parseArgs(rt, shareableArgs);
          hostFun(
              rt,
              jsi::Value::undefined(),
              const_cast<const jsi::Value *>(args.data()),
              args.size());
        });
      });

  jsi_utils::installJsiFunction(
      rt,
      "_scheduleOnRuntime",
      [](jsi::Runtime &rt,
         const jsi::Value &workletRuntimeValue,
         const jsi::Value &shareableWorkletValue) {
        scheduleOnRuntime(rt, workletRuntimeValue, shareableWorkletValue);
      });

  jsi::Object performance(rt);
  performance.setProperty(
      rt,
      "now",
      jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forAscii(rt, "now"),
          0,
          [](jsi::Runtime &runtime,
             const jsi::Value &,
             const jsi::Value *args,
             size_t count) { return jsi::Value(performanceNow()); }));
  rt.global().setProperty(rt, "performance", performance);
}

} // namespace worklets
