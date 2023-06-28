#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <utility>

#include "Shareables.h"

using namespace facebook;

namespace reanimated {

class WorkletEventHandler {
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  jsi::Value handlerFunction_;
  uint64_t handlerId_;
  std::string eventName_;

 public:
  WorkletEventHandler(
      const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
      uint64_t handlerId,
      std::string eventName,
      jsi::Value &&handlerFunction)
      : runtimeHelper_(runtimeHelper),
        handlerId_(handlerId),
        eventName_(eventName),
        handlerFunction_(std::move(handlerFunction)) {}
  void process(double eventTimestamp, const jsi::Value &eventValue) const;
  uint64_t getHandlerId() const;
  const std::string &getEventName() const;
};

} // namespace reanimated
