#include <worklets/WorkletRuntime/ReanimatedHermesRuntime.h>

// Only include this file in Hermes-enabled builds as some platforms (like tvOS)
// don't support hermes and it causes the compilation to fail.
#if JS_RUNTIME_HERMES

#include <cxxreact/MessageQueueThread.h>
#include <jsi/decorator.h>
#include <jsi/jsi.h>

#include <memory>
#include <string>
#include <utility>

#if __has_include(<reacthermes/HermesExecutorFactory.h>)
#include <reacthermes/HermesExecutorFactory.h>
#else // __has_include(<hermes/hermes.h>) || ANDROID
#include <hermes/hermes.h>
#endif

namespace worklets {

#if HERMES_ENABLE_DEBUGGER

class HermesExecutorRuntimeAdapter
    : public facebook::hermes::inspector_modern::RuntimeAdapter {
 public:
  explicit HermesExecutorRuntimeAdapter(
      facebook::hermes::HermesRuntime &hermesRuntime,
      const std::shared_ptr<facebook::react::MessageQueueThread> &thread)
      : hermesRuntime_(hermesRuntime), thread_(std::move(thread)) {}

  virtual ~HermesExecutorRuntimeAdapter() {
    // This is required by iOS, because there is an assertion in the destructor
    // that the thread was indeed `quit` before
    thread_->quitSynchronous();
  }

  facebook::hermes::HermesRuntime &getRuntime() override {
    return hermesRuntime_;
  }

  // This is not empty in the original implementation, but we decided to tickle
  // the runtime by running a small piece of code on every frame as using this
  // required us to hold a refernce to the runtime inside this adapter which
  // caused issues while reloading the app.
  void tickleJs() override {}

 public:
  facebook::hermes::HermesRuntime &hermesRuntime_;
  std::shared_ptr<facebook::react::MessageQueueThread> thread_;
};

#endif // HERMES_ENABLE_DEBUGGER

ReanimatedHermesRuntime::ReanimatedHermesRuntime(
    std::unique_ptr<facebook::hermes::HermesRuntime> runtime,
    const std::shared_ptr<facebook::react::MessageQueueThread> &jsQueue,
    const std::string &name)
    : facebook::jsi::WithRuntimeDecorator<ReanimatedReentrancyCheck>(
          *runtime,
          reentrancyCheck_),
      runtime_(std::move(runtime)) {
#if HERMES_ENABLE_DEBUGGER
  auto adapter =
      std::make_unique<HermesExecutorRuntimeAdapter>(*runtime_, jsQueue);
  debugToken_ = facebook::hermes::inspector_modern::chrome::enableDebugging(
      std::move(adapter), name);
#else
  // This is required by iOS, because there is an assertion in the destructor
  // that the thread was indeed `quit` before
  jsQueue->quitSynchronous();
#endif // HERMES_ENABLE_DEBUGGER

#ifndef NDEBUG
  facebook::hermes::HermesRuntime *wrappedRuntime = runtime_.get();
  facebook::jsi::Value evalWithSourceMap =
      facebook::jsi::Function::createFromHostFunction(
          *runtime_,
          facebook::jsi::PropNameID::forAscii(*runtime_, "evalWithSourceMap"),
          3,
          [wrappedRuntime](
              facebook::jsi::Runtime &rt,
              const facebook::jsi::Value &thisValue,
              const facebook::jsi::Value *args,
              size_t count) -> facebook::jsi::Value {
            auto code = std::make_shared<const facebook::jsi::StringBuffer>(
                args[0].asString(rt).utf8(rt));
            std::string sourceURL;
            if (count > 1 && args[1].isString()) {
              sourceURL = args[1].asString(rt).utf8(rt);
            }
            std::shared_ptr<const facebook::jsi::Buffer> sourceMap;
            if (count > 2 && args[2].isString()) {
              sourceMap = std::make_shared<const facebook::jsi::StringBuffer>(
                  args[2].asString(rt).utf8(rt));
            }
            return wrappedRuntime->evaluateJavaScriptWithSourceMap(
                code, sourceMap, sourceURL);
          });
  runtime_->global().setProperty(
      *runtime_, "evalWithSourceMap", evalWithSourceMap);
#endif // NDEBUG
}

ReanimatedHermesRuntime::~ReanimatedHermesRuntime() {
#if HERMES_ENABLE_DEBUGGER
  // We have to disable debugging before the runtime is destroyed.
  facebook::hermes::inspector_modern::chrome::disableDebugging(debugToken_);
#endif // HERMES_ENABLE_DEBUGGER
}

} // namespace worklets

#endif // JS_RUNTIME_HERMES
