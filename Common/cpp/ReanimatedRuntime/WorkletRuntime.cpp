#include "WorkletRuntime.h"
#include "JsiUtils.h"
#include "RuntimeDecorator.h"
#include "WorkletRuntimeCollector.h"

namespace reanimated {

WorkletRuntime::WorkletRuntime(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<JSScheduler> &jsScheduler,
    const std::string &name)
    : runtime_(ReanimatedRuntime::make(rnRuntime, name)), name_(name) {
  jsi::Runtime &rt = *runtime_;
  WorkletRuntimeCollector::install(rt);
  bindGlobal();
  bindScheduleOnJS(jsScheduler);
  bindMakeShareableClone();
  RuntimeDecorator::decorateRuntime(rt, name_);
}

void WorkletRuntime::bindGlobal() {
  jsi::Runtime &rt = *runtime_;
  rt.global().setProperty(rt, "global", rt.global());
  // resolves "ReferenceError: Property 'global' doesn't exist at ..."
}

void WorkletRuntime::bindScheduleOnJS(
    const std::shared_ptr<JSScheduler> &jsScheduler) {
  jsi_utils::installJsiFunction(
      *runtime_,
      "_scheduleOnJS",
      [jsScheduler](
          jsi::Runtime &rt,
          const jsi::Value &remoteFun,
          const jsi::Value &argsValue) {
        auto shareableRemoteFun = extractShareableOrThrow<
            ShareableRemoteFunction>(
            rt,
            remoteFun,
            "Incompatible object passed to scheduleOnJS. It is only allowed to schedule worklets or functions defined on the React Native JS runtime this way.");
        auto shareableArgs = argsValue.isUndefined()
            ? nullptr
            : extractShareableOrThrow<ShareableArray>(
                  rt, argsValue, "args must be an array");
        jsScheduler->scheduleOnJS([=](jsi::Runtime &rt) {
          auto remoteFun = shareableRemoteFun->getJSValue(rt);
          if (shareableArgs == nullptr) {
            // fast path for remote function w/o arguments
            remoteFun.asObject(rt).asFunction(rt).call(rt);
          } else {
            auto argsArray =
                shareableArgs->getJSValue(rt).asObject(rt).asArray(rt);
            auto argsSize = argsArray.size(rt);
            // number of arguments is typically relatively small so it is ok to
            // to use VLAs here, hence disabling the lint rule
            jsi::Value args[argsSize]; // NOLINT(runtime/arrays)
            for (size_t i = 0; i < argsSize; i++) {
              args[i] = argsArray.getValueAtIndex(rt, i);
            }
            remoteFun.asObject(rt).asFunction(rt).call(rt, args, argsSize);
          }
        });
      });
}

void WorkletRuntime::bindMakeShareableClone() {
  jsi_utils::installJsiFunction(
      *runtime_,
      "_makeShareableClone",
      [](jsi::Runtime &rt, const jsi::Value &value) {
        auto shouldRetainRemote = jsi::Value::undefined();
        return reanimated::makeShareableClone(rt, value, shouldRetainRemote);
      });
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

} // namespace reanimated
