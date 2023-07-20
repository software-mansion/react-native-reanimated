#include "EventHandlerRegistry.h"
#include "WorkletEventHandler.h"

#include <utility>

namespace reanimated {

void EventHandlerRegistry::registerEventHandler(
    std::shared_ptr<WorkletEventHandler> eventHandler) {
  const std::lock_guard<std::mutex> lock(instanceMutex);
  const auto &eventName = eventHandler->getEventName();
  const auto emitterReactTag = eventHandler->getEmitterReactTag();
  const auto eventHash = std::make_pair(emitterReactTag, eventName);
  auto handlerId = eventHandler->getHandlerId();
  eventMappings[eventHash][handlerId] = eventHandler;
  eventHandlers[handlerId] = eventHandler;
}

void EventHandlerRegistry::unregisterEventHandler(uint64_t id) {
  const std::lock_guard<std::mutex> lock(instanceMutex);
  auto handlerIt = eventHandlers.find(id);
  if (handlerIt != eventHandlers.end()) {
    const auto &eventName = handlerIt->second->getEventName();
    const auto emitterReactTag = handlerIt->second->getEmitterReactTag();
    const auto eventHash = std::make_pair(emitterReactTag, eventName);

    auto eventMappingIt = eventMappings.find(eventHash);
    auto &handlersMap = eventMappingIt->second;
    handlersMap.erase(id);
    if (handlersMap.empty()) {
      eventMappings.erase(eventMappingIt);
    }
    eventHandlers.erase(handlerIt);
  }
}

void EventHandlerRegistry::processEvent(
    jsi::Runtime &rt,
    double eventTimestamp,
    const std::string &eventName,
    const int emitterReactTag,
    const jsi::Value &eventPayload) {
  std::vector<std::shared_ptr<WorkletEventHandler>> handlersForEvent;
  {
    const std::lock_guard<std::mutex> lock(instanceMutex);
    auto eventHash = std::make_pair(-1, eventName);
    auto handlersIt = eventMappings.find(eventHash);
    if (handlersIt != eventMappings.end()) {
      for (auto handler : handlersIt->second) {
        handlersForEvent.push_back(handler.second);
      }
    }
    eventHash = std::make_pair(emitterReactTag, eventName);
    handlersIt = eventMappings.find(eventHash);
    if (handlersIt != eventMappings.end()) {
      for (auto handler : handlersIt->second) {
        handlersForEvent.push_back(handler.second);
      }
    }
  }

  eventPayload.asObject(rt).setProperty(
      rt, "eventName", jsi::String::createFromUtf8(rt, eventName));
  for (auto handler : handlersForEvent) {
    handler->process(eventTimestamp, eventPayload);
  }
}

bool EventHandlerRegistry::isAnyHandlerWaitingForEvent(
    const std::string &eventName,
    const int emitterReactTag) {
  const std::lock_guard<std::mutex> lock(instanceMutex);
  auto eventHash = std::make_pair(emitterReactTag, eventName);
  auto it = eventMappings.find(eventHash);
  return (it != eventMappings.end()) && (!(it->second).empty());
}

} // namespace reanimated
