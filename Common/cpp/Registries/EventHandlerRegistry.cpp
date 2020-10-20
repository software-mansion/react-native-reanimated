#include "EventHandlerRegistry.h"
#include "EventHandler.h"

namespace reanimated {

static jsi::Value eval(jsi::Runtime &rt, const char *code) {
  return rt.global().getPropertyAsFunction(rt, "eval").call(rt, code);
}

void EventHandlerRegistry::registerEventHandler(std::shared_ptr<EventHandler> eventHandler) {
  eventMappings[eventHandler->eventName][eventHandler->id] = eventHandler;
  eventHandlers[eventHandler->id] = eventHandler;
}

void EventHandlerRegistry::unregisterEventHandler(unsigned long id) {
  auto handlerIt = eventHandlers.find(id);
  if (handlerIt != eventHandlers.end()) {
    eventMappings[handlerIt->second->eventName].erase(id);
  }
}

void EventHandlerRegistry::processEvent(jsi::Runtime &rt, std::string eventName, std::string eventPayload) {
  auto handlersIt = eventMappings.find(eventName);
  if (handlersIt != eventMappings.end()) {
    std::string delimimter = "NativeMap:";
    auto eventSplitted = eventPayload.substr(eventPayload.find(delimimter) + del.size(), eventPayload.size());
    auto eventJSON = eventSplitted.substr(0, eventSplitted.size() - 1);
    std::vector<uint8_t> eventJSONVector(eventJSON.begin(), eventJSON.end());

    auto eventObject = jsi::Value::createFromJsonUtf8(rt, &eventJSONVector[0], eventJSON.size());
      
    eventObject.asObject(rt).setProperty(rt, "eventName", jsi::String::createFromUtf8(rt, eventName));
    for (auto handler : handlersIt->second) {
      handler.second->process(rt, eventObject);
    }
  }
}

}
