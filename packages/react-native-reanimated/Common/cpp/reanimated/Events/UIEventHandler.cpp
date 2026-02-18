#include <reanimated/Events/UIEventHandler.h>

#include <memory>
#include <string>

using namespace worklets;

namespace reanimated {

void UIEventHandler::process(
    const std::shared_ptr<WorkletRuntime> &uiRuntime,
    const double eventTimestamp,
    const jsi::Value &eventValue) const {
  uiRuntime->runSync(handlerFunction_, jsi::Value(eventTimestamp), eventValue);
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
