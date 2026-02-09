#pragma once

#include <jsi/jsi.h>
#include <worklets/WorkletRuntime/WorkletRuntime.h>

#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <utility>

using namespace facebook;

namespace reanimated {

class UIEventHandler;

class UIEventHandlerRegistry {
  std::map<std::pair<int, std::string>, std::unordered_map<uint64_t, std::shared_ptr<UIEventHandler>>>
      eventMappingsWithTag;
  std::map<std::string, std::unordered_map<uint64_t, std::shared_ptr<UIEventHandler>>> eventMappingsWithoutTag;
  std::map<uint64_t, std::shared_ptr<UIEventHandler>> eventHandlers;
  std::mutex instanceMutex;

 public:
  void registerEventHandler(const std::shared_ptr<UIEventHandler> &eventHandler);
  void unregisterEventHandler(const uint64_t id);

  void processEvent(
      const std::shared_ptr<worklets::WorkletRuntime> &uiRuntime,
      const double eventTimestamp,
      const std::string &eventName,
      const int emitterReactTag,
      const jsi::Value &eventPayload);

  bool isAnyHandlerWaitingForEvent(const std::string &eventName, const int emitterReactTag);
};

} // namespace reanimated
