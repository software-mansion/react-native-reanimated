#ifdef DEBUG

#include "JSLogger.h"
#include <memory>

namespace reanimated {

JSLogger::JSLogger(const std::shared_ptr<JSRuntimeHelper> &runtimeHelper)
    : runtimeHelper_(runtimeHelper) {}

void JSLogger::warnOnJS(const std::string &warning) const {
  runtimeHelper_->scheduleOnJS([warning, &runtimeHelper = runtimeHelper_]() {
    jsi::Runtime &rt = *(runtimeHelper->rnRuntime());
    auto console = rt.global().getPropertyAsObject(rt, "console");
    auto warn = console.getPropertyAsFunction(rt, "warn");
    warn.call(rt, jsi::String::createFromUtf8(rt, warning));
  });
}

} // namespace reanimated

#endif // DEBUG
