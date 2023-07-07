#ifdef DEBUG

#include "JSLogger.h"
#include <memory>

namespace reanimated {
JSLogger::JSLogger(const std::shared_ptr<JSRuntimeHelper> &runtimeHelper)
    : runtimeHelper_(runtimeHelper) {}

void JSLogger::warnOnJs(const std::string &warning) const {
  runtimeHelper_->scheduleOnJS(
      [warning = warning, &runtimeHelper_ = runtimeHelper_]() {
        jsi::Runtime &rt = *(runtimeHelper_->rnRuntime());
        auto console = rt.global().getPropertyAsObject(rt, "console");
        auto warn = console.getPropertyAsFunction(rt, "warn");
        warn.call(rt, jsi::String::createFromUtf8(rt, warning));
      });
}
} // namespace reanimated

#endif // DEBUG
