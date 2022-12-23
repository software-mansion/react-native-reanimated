#pragma once

#include <jsi/jsi.h>
#include <string>
#include <utility>

#include "Shareables.h"

using namespace facebook;

namespace reanimated {

class EventHandlerRegistry;

class WorkletEventHandler {
  friend EventHandlerRegistry;

 private:
  std::shared_ptr<JSRuntimeHelper> _runtimeHelper;
  unsigned long id;
  std::string eventName;
  jsi::Value _handlerFunction;

 public:
  WorkletEventHandler(
      const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
      unsigned long id,
      std::string eventName,
      jsi::Value &&handlerFunction)
      : _runtimeHelper(runtimeHelper),
        id(id),
        eventName(eventName),
        _handlerFunction(std::move(handlerFunction)) {}
  void process(double eventTimestamp, const jsi::Value &eventValue);
};

} // namespace reanimated
