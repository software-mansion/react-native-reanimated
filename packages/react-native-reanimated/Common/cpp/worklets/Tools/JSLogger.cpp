#include <worklets/Tools/JSLogger.h>
#include <memory>

namespace worklets {

void JSLogger::warnOnJS(const std::string &warning) const {
#ifndef NDEBUG
  jsScheduler_->scheduleOnJS([warning](facebook::jsi::Runtime &rt) {
    auto console = rt.global().getPropertyAsObject(rt, "console");
    auto warn = console.getPropertyAsFunction(rt, "warn");
    warn.call(rt, facebook::jsi::String::createFromUtf8(rt, warning));
  });
#endif // NDEBUG
}

} // namespace worklets
