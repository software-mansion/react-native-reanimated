#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <utility>

#include "Shareables.h"

using namespace facebook;

namespace reanimated {

class WorkletEventHandler {
  const jsi::Value handlerFunction_;
  const uint64_t handlerId_;
  const std::string eventName_;

 public:
  WorkletEventHandler(
      const uint64_t handlerId,
      const std::string &eventName,
      jsi::Value &&handlerFunction)
      : handlerFunction_(std::move(handlerFunction)),
        handlerId_(handlerId),
        eventName_(eventName) {}
  void process(
      jsi::Runtime &uiRuntime,
      const double eventTimestamp,
      const jsi::Value &eventValue) const;
  uint64_t getHandlerId() const;
  const std::string &getEventName() const;
};

} // namespace reanimated
