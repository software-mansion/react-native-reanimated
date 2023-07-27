#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <utility>

#include "Shareables.h"

using namespace facebook;

namespace reanimated {

class WorkletEventHandler {
  const std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  const jsi::Value handlerFunction_;
  const uint64_t handlerId_;
  const std::string eventName_;
  const uint64_t emitterReactTag_;

 public:
  WorkletEventHandler(
      const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
      const uint64_t handlerId,
      const std::string &eventName,
      const uint64_t emitterReactTag,
      jsi::Value &&handlerFunction)
      : runtimeHelper_(runtimeHelper),
        handlerFunction_(std::move(handlerFunction)),
        handlerId_(handlerId),
        eventName_(eventName),
        emitterReactTag_(emitterReactTag) {}
  void process(double eventTimestamp, const jsi::Value &eventValue) const;
  uint64_t getHandlerId() const;
  const std::string &getEventName() const;
  uint64_t getEmitterReactTag() const;
  bool shouldIgnoreEmitterReactTag() const;
};

} // namespace reanimated
