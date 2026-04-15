#include <worklets/Tools/JSLogger.h>

#include <memory>
#include <string>
#include <utility>

namespace worklets {

void JSLogger::warnOnJS(const std::string &warning) const {
#ifndef NDEBUG
  jsScheduler_->scheduleOnJS([warning](jsi::Runtime &rnRuntime) {
    auto console = rnRuntime.global().getPropertyAsObject(rnRuntime, "console");
    auto warn = console.getPropertyAsFunction(rnRuntime, "warn");
    warn.call(rnRuntime, jsi::String::createFromUtf8(rnRuntime, warning));
  });
#endif // NDEBUG
}

void JSLogger::reportFatalErrorOnJS(
    const std::shared_ptr<JSScheduler> &jsScheduler,
    JSErrorData &&jsErrorData,
    bool force) {
  auto job = [jsErrorData = std::move(jsErrorData), force](jsi::Runtime &rnRuntime) {
    reportFatalErrorOnJS(rnRuntime, jsErrorData, force);
  };
  if (jsScheduler->canInvokeSyncOnJS()) {
    jsScheduler->invokeSyncOnJS(job);
  } else {
    jsScheduler->scheduleOnJS(job);
  }
}

void JSLogger::reportFatalErrorOnJS(jsi::Runtime &rnRuntime, const JSErrorData &jsErrorData, bool force) {
  const auto &global = rnRuntime.global();
  const auto errorInstance =
      rnRuntime.global().getPropertyAsFunction(rnRuntime, "Error").callAsConstructor(rnRuntime).asObject(rnRuntime);

  errorInstance.setProperty(rnRuntime, "message", jsi::String::createFromUtf8(rnRuntime, jsErrorData.message));

  errorInstance.setProperty(rnRuntime, "stack", jsi::String::createFromUtf8(rnRuntime, jsErrorData.stack));

  errorInstance.setProperty(rnRuntime, "name", jsi::String::createFromUtf8(rnRuntime, jsErrorData.name));

  errorInstance.setProperty(rnRuntime, "jsEngine", jsi::String::createFromUtf8(rnRuntime, jsErrorData.jsEngine));

  const auto &reportFatalErrorFunction = global.getPropertyAsFunction(rnRuntime, "__reportFatalRemoteError");
  reportFatalErrorFunction.call(rnRuntime, errorInstance, force);
}

} // namespace worklets
