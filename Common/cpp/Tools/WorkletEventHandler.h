#pragma once

#include <jsi/jsi.h>
#include <string>
#include <utility>

using namespace facebook;

namespace reanimated {

class EventHandlerRegistry;

class WorkletEventHandler {
  friend EventHandlerRegistry;

 private:
  uint64_t id;
  std::string eventName;
  jsi::Function handler;

 public:
  WorkletEventHandler(
      uint64_t id,
      std::string eventName,
      jsi::Function &&handler)
      : id(id), eventName(eventName), handler(std::move(handler)) {}
  void process(jsi::Runtime &rt, const jsi::Value &eventValue);
};

} // namespace reanimated
