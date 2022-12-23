#include "WorkletEventHandler.h"

namespace reanimated {

void WorkletEventHandler::process(
    double eventTimestamp,
    const jsi::Value &eventValue) {
  _runtimeHelper->runOnUIGuarded(eventTimestamp, _handlerFunction, eventValue);
}

} // namespace reanimated
