#include "WorkletEventHandler.h"

namespace reanimated {

void WorkletEventHandler::process(
    double eventTimestamp,
    const jsi::Value &eventValue) const {
  runtimeHelper_->runOnUIGuarded(
      handlerFunction_, jsi::Value(eventTimestamp), eventValue);
}

uint64_t WorkletEventHandler::getHandlerId() const {
  return handlerId_;
}

const std::string &WorkletEventHandler::getEventName() const {
  return eventName_;
}

uint64_t WorkletEventHandler::getEmitterReactTag() const {
  return emitterReactTag_;
}

bool WorkletEventHandler::ignoreEmitterReactTag() const {
  return emitterReactTag_ == -1;
}

} // namespace reanimated
