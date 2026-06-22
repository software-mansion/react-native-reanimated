#include <worklets/Tools/ScriptBuffer.h>
#include <worklets/WorkletRuntime/WorkletHermesRuntime.h>

#include <jsi/jsi.h>

#include <memory>
#include <string>
#include <utility>

namespace worklets {

WorkletHermesRuntime::WorkletHermesRuntime(std::unique_ptr<facebook::hermes::HermesRuntime> runtime)
    : jsi::WithRuntimeDecorator<WorkletsReentrancyCheck>(*runtime, reentrancyCheck_), runtime_(std::move(runtime)) {
#ifndef NDEBUG
  facebook::hermes::HermesRuntime *wrappedRuntime = runtime_.get();
  jsi::Value evalWithSourceMap = jsi::Function::createFromHostFunction(
      *runtime_,
      jsi::PropNameID::forAscii(*runtime_, "evalWithSourceMap"),
      3,
      [wrappedRuntime](
          jsi::Runtime &rt, const jsi::Value &thisValue, const jsi::Value *args, size_t count) -> jsi::Value {
        auto code = std::make_shared<const jsi::StringBuffer>(args[0].asString(rt).utf8(rt));
        std::string sourceURL;
        if (count > 1 && args[1].isString()) {
          sourceURL = args[1].asString(rt).utf8(rt);
        }
        std::shared_ptr<const jsi::Buffer> sourceMap;
        if (count > 2 && args[2].isString()) {
          sourceMap = std::make_shared<const jsi::StringBuffer>(args[2].asString(rt).utf8(rt));
        }
        return wrappedRuntime->evaluateJavaScriptWithSourceMap(code, sourceMap, sourceURL);
      });
  runtime_->global().setProperty(*runtime_, "evalWithSourceMap", evalWithSourceMap);
#endif // NDEBUG

  auto evalBytecode = [](facebook::jsi::Runtime &rt,
                         const facebook::jsi::Value &,
                         const facebook::jsi::Value *args,
                         size_t) -> facebook::jsi::Value {
    const auto buffer = args[0].getObject(rt).getArrayBuffer(rt);
    auto data = std::vector<uint8_t>(buffer.data(rt), buffer.data(rt) + buffer.size(rt));
    return rt.evaluateJavaScript(std::make_shared<BytecodeBuffer>(data), "");
  };
  runtime_->global().setProperty(
      *runtime_,
      "evalBytecode",
      facebook::jsi::Function::createFromHostFunction(
          *runtime_, facebook::jsi::PropNameID::forAscii(*runtime_, "evalBytecode"), 1, evalBytecode));
}

WorkletHermesRuntime::~WorkletHermesRuntime() = default;

} // namespace worklets
