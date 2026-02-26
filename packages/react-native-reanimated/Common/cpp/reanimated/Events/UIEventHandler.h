#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/Serializable.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <memory>
#include <string>

using namespace facebook;

namespace reanimated {

class UIEventHandler {
  const uint64_t handlerId_;
  const uint64_t emitterReactTag_;
  const std::string eventName_;
  const std::shared_ptr<worklets::SerializableWorklet> handlerFunction_;

 public:
  UIEventHandler(
      const uint64_t handlerId,
      const std::string &eventName,
      const uint64_t emitterReactTag,
      const std::shared_ptr<worklets::SerializableWorklet> &handlerFunction)
      : handlerId_(handlerId),
        emitterReactTag_(emitterReactTag),
        eventName_(eventName),
        handlerFunction_(handlerFunction) {}
  void process(
      const std::shared_ptr<worklets::WorkletRuntime> &uiRuntime,
      double eventTimestamp,
      const jsi::Value &eventValue) const;
  uint64_t getHandlerId() const;
  const std::string &getEventName() const;
  uint64_t getEmitterReactTag() const;
  bool shouldIgnoreEmitterReactTag() const;
};

} // namespace reanimated
