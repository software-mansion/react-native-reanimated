#include <worklets/SharedItems/Shareables.h>
#include <worklets/Tools/JSISerializer.h>
#include <worklets/Tools/ReanimatedJSIUtils.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>
#include <worklets/WorkletRuntime/WorkletRuntimeDecorator.h>

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
    const std::shared_ptr<JSScheduler> &jsScheduler) {
  // resolves "ReferenceError: Property 'global' doesn't exist at ..."
  rt.global().setProperty(rt, "global", rt.global());

  rt.global().setProperty(rt, "_WORKLET", true);

  rt.global().setProperty(rt, "_LABEL", jsi::String::createFromAscii(rt, name));

#ifdef RCT_NEW_ARCH_ENABLED
  constexpr auto isFabric = true;
#else
  constexpr auto isFabric = false;
#endif // RCT_NEW_ARCH_ENABLED
  rt.global().setProperty(rt, "_IS_FABRIC", isFabric);

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
      "_scheduleRemoteFunctionOnJS",
      [jsScheduler](
          jsi::Runtime &rt,
          const jsi::Value &funValue,
          const jsi::Value &argsValue) {
        auto shareableRemoteFun = extractShareableOrThrow<
            ShareableRemoteFunction>(
            rt,
            funValue,
            "[Reanimated] Incompatible object passed to scheduleOnJS. It is only allowed to schedule worklets or functions defined on the React Native JS runtime this way.");

        auto shareableArgs = argsValue.isUndefined()
            ? nullptr
            : extractShareableOrThrow<ShareableArray>(
                  rt, argsValue, "[Reanimated] Args must be an array.");

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
                  rt, argsValue, "[Reanimated] Args must be an array.");

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
