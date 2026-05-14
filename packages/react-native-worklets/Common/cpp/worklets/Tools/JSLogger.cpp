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

  const auto &reportFatalErrorFunction = global.getPropertyAsFunction(rnRuntime, "__reportFatalRemoteError");
  reportFatalErrorFunction.call(rnRuntime, errorInstance, force);
}

#ifndef NDEBUG
static std::string labelStackFrames(const std::string &rawStack, const std::string &label) {
  static const std::string sep = "\n    at";
  std::string result;
  size_t pos = rawStack.find(sep);
  while (pos != std::string::npos) {
    size_t next = rawStack.find(sep, pos + sep.size());
    size_t end = (next == std::string::npos) ? rawStack.size() : next;
    result += "\n    at [" + label + "]:" + rawStack.substr(pos + sep.size(), end - (pos + sep.size()));
    pos = next;
  }
  return result;
}

void JSLogger::handleJSError(
    const std::shared_ptr<JSScheduler> &jsScheduler,
    jsi::Runtime &workletRuntime,
    const std::string &runtimeName,
    jsi::JSError &error,
    const std::optional<std::string> &scheduleStack) {
  std::string name = "WorkletsError";
  const auto &errVal = error.value();
  if (errVal.isObject()) {
    auto errObj = errVal.asObject(workletRuntime);
    if (errObj.hasProperty(workletRuntime, "name")) {
      auto nameVal = errObj.getProperty(workletRuntime, "name");
      if (nameVal.isString()) {
        name = nameVal.asString(workletRuntime).utf8(workletRuntime);
      }
    }
  }

  const auto &message = error.getMessage();
  std::string combined = message + labelStackFrames(error.getStack(), runtimeName);
  if (scheduleStack.has_value()) {
    auto pos = scheduleStack->find("\n    at");
    if (pos != std::string::npos) {
      combined += scheduleStack->substr(pos);
    }
  }
  reportFatalErrorOnJS(jsScheduler, JSErrorData{.message = message, .stack = combined, .name = name});
}
#endif // NDEBUG

} // namespace worklets
