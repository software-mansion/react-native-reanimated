#include <worklets/Tools/Promise.h>

namespace worklets {

void Promise::resolve(const jsi::Value &result) {
  auto resolve = resolve_->toJSValue(rt_).asObject(rt_).asFunction(rt_);
  resolve.call(rt_, result);
}

void Promise::reject(
    const std::string &message,
    const std::string &stack,
    const std::string &name,
    const std::string &jsEngine) {
  const auto reject = reject_->toJSValue(rt_).asObject(rt_).asFunction(rt_);
  const auto errorInstance = rt_.global()
                                 .getPropertyAsFunction(rt_, "Error")
                                 .callAsConstructor(rt_)
                                 .asObject(rt_);

  errorInstance.setProperty(
      rt_, "message", jsi::String::createFromUtf8(rt_, message));

  errorInstance.setProperty(
      rt_, "stack", jsi::String::createFromUtf8(rt_, stack));

  errorInstance.setProperty(
      rt_, "name", jsi::String::createFromUtf8(rt_, name));

  errorInstance.setProperty(
      rt_, "jsEngine", jsi::String::createFromUtf8(rt_, jsEngine));

  reject.call(rt_, errorInstance);
}

} // namespace worklets
