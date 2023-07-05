#include "JSLogger.h"
#include <memory>

namespace reanimated {
JSLogger::JSLogger() {}
JSLogger::JSLogger(const std::shared_ptr<JSRuntimeHelper> &runtimeHelper)
    : runtimeHelper(runtimeHelper) {}

void JSLogger::warnOnJs(std::string warning) const {
  runtimeHelper->scheduleOnJS([=]() {
    jsi::Runtime &rt = *(runtimeHelper->rnRuntime());
    auto console = rt.global().getPropertyAsObject(rt, "console");
    auto warn = console.getPropertyAsFunction(rt, "warn");
    warn.call(rt, warning.c_str());
  });
}
} // namespace reanimated
