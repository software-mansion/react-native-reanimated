#include <reanimated/Events/UIEventHandler.h>

#include <memory>
#include <string>

namespace reanimated {

using namespace worklets;

void UIEventHandler::process(
    const std::shared_ptr<WorkletRuntimeHolder> &uiRuntimeHolder,
    const double eventTimestamp,
    const jsi::Value &eventValue) const {
  runSyncOnRuntime(uiRuntimeHolder, handlerFunction_, jsi::Value(eventTimestamp), eventValue);
}

uint64_t UIEventHandler::getHandlerId() const {
  return handlerId_;
}

const std::string &UIEventHandler::getEventName() const {
  return eventName_;
}

uint64_t UIEventHandler::getEmitterReactTag() const {
  return emitterReactTag_;
}

bool UIEventHandler::shouldIgnoreEmitterReactTag() const {
  return emitterReactTag_ == -1;
}

} // namespace reanimated
