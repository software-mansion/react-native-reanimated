#pragma once

#include <memory>
#include <vector>

#include "NativeReanimatedModuleSpec.h"
#include "Scheduler.h"
#include "ErrorHandler.h"
#include "WorkletsCache.h"

#include <unistd.h>

namespace reanimated {

using FrameCallback = std::function<void(double)>;

class ShareableValue;
class MapperRegistry;
class EventHandlerRegistry;

class NativeReanimatedModule : public NativeReanimatedModuleSpec {
  friend ShareableValue;
  
  public:
    NativeReanimatedModule(std::shared_ptr<CallInvoker> jsInvoker,
                           std::shared_ptr<Scheduler> scheduler,
                           std::unique_ptr<jsi::Runtime> rt,
                           std::function<void(std::function<void(double)>)> requestRender,
                           std::function<void(jsi::Runtime&, int, const jsi::Object&)> propUpdater);
    virtual ~NativeReanimatedModule();

    void installCoreFunctions(jsi::Runtime &rt, const jsi::Value &valueSetter) override;

    jsi::Value makeShareable(jsi::Runtime &rt, const jsi::Value &value) override;
    jsi::Value makeMutable(jsi::Runtime &rt, const jsi::Value &value) override;
    jsi::Value makeRemote(jsi::Runtime &rt, const jsi::Value &value) override;

    jsi::Value startMapper(jsi::Runtime &rt, const jsi::Value &worklet, const jsi::Value &inputs, const jsi::Value &outputs) override;
    void stopMapper(jsi::Runtime &rt, const jsi::Value &mapperId) override;

    jsi::Value registerEventHandler(jsi::Runtime &rt, const jsi::Value &eventHash, const jsi::Value &worklet) override;
    void unregisterEventHandler(jsi::Runtime &rt, const jsi::Value &registrationId) override;

    void onRender(double timestampMs);
    void onEvent(std::string eventName, std::string eventAsString);

    void maybeRequestRender();

    bool isUIRuntime(jsi::Runtime &rt);
    bool isHostRuntime(jsi::Runtime &rt);

  private:
    std::unique_ptr<jsi::Runtime> runtime;
    std::shared_ptr<MapperRegistry> mapperRegistry;
    std::shared_ptr<EventHandlerRegistry> eventHandlerRegistry;
    std::function<void(FrameCallback)> requestRender;
    std::shared_ptr<ErrorHandler> errorHandler;
    std::shared_ptr<jsi::Value> dummyEvent;
    std::vector<FrameCallback> frameCallbacks;
    bool renderRequested = false;
  public:
  std::shared_ptr<WorkletsCache> workletsCache;
  std::shared_ptr<ShareableValue> valueSetter;
  std::shared_ptr<Scheduler> scheduler;
};

}
