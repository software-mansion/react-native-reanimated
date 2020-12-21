#pragma once

#include "NativeReanimatedModuleSpec.h"
#include "Scheduler.h"
#include "ErrorHandler.h"
#include "WorkletsCache.h"
#include "RuntimeDecorator.h"
#include "PlatformDepMethodsHolder.h"
#include <unistd.h>
#include <memory>
#include <vector>
#include <thread>
#include <unordered_map>

namespace reanimated
{

using FrameCallback = std::function<void(double)>;

class ShareableValue;
class MutableValue;
class MapperRegistry;
class EventHandlerRegistry;

class NativeReanimatedModule : public NativeReanimatedModuleSpec
{
  friend ShareableValue;
  friend MutableValue;
  
  public:
    NativeReanimatedModule(std::shared_ptr<CallInvoker> jsInvoker,
                           std::shared_ptr<Scheduler> scheduler,
                           std::unique_ptr<jsi::Runtime> rt,
                           std::shared_ptr<ErrorHandler> errorHandler,
                           std::function<jsi::Value(jsi::Runtime &, const int, const jsi::String &)> propObtainer,
                           PlatformDepMethodsHolder platformDepMethodsHolder,
                           std::function<std::unique_ptr<jsi::Runtime>()> runtimeObtainer);

    virtual ~NativeReanimatedModule();

    void installCoreFunctions(jsi::Runtime &rt, const jsi::Value &valueSetter) override;

    jsi::Value makeShareable(jsi::Runtime &rt, const jsi::Value &value) override;
    jsi::Value makeMutable(jsi::Runtime &rt, const jsi::Value &value) override;
    jsi::Value makeRemote(jsi::Runtime &rt, const jsi::Value &value) override;

    jsi::Value startMapper(jsi::Runtime &rt, const jsi::Value &worklet, const jsi::Value &inputs, const jsi::Value &outputs) override;
    void stopMapper(jsi::Runtime &rt, const jsi::Value &mapperId) override;

    jsi::Value registerEventHandler(jsi::Runtime &rt, const jsi::Value &eventHash, const jsi::Value &worklet) override;
    void unregisterEventHandler(jsi::Runtime &rt, const jsi::Value &registrationId) override;

    jsi::Value getViewProp(jsi::Runtime &rt, const jsi::Value &viewTag, const jsi::Value &propName, const jsi::Value &callback) override;

    jsi::Value spawnThread(jsi::Runtime &rt, const jsi::Value &operations) override;

    void onRender(double timestampMs);
    void onEvent(std::string eventName, std::string eventAsString);
    bool isAnyHandlerWaitingForEvent(std::string eventName);

    void maybeRequestRender();

    bool isUIRuntime(jsi::Runtime &rt);
    bool isHostRuntime(jsi::Runtime &rt);
  public:
    std::unique_ptr<jsi::Runtime> runtime;
  private:
    std::shared_ptr<MapperRegistry> mapperRegistry;
    std::shared_ptr<EventHandlerRegistry> eventHandlerRegistry;
    std::function<void(FrameCallback, jsi::Runtime&)> requestRender;
    std::shared_ptr<jsi::Value> dummyEvent;
    std::vector<FrameCallback> frameCallbacks;
    bool renderRequested = false;
    std::function<jsi::Value(jsi::Runtime &, const int, const jsi::String &)> propObtainer;
    std::function<std::unique_ptr<jsi::Runtime>()> runtimeObtainer;
  public:
  std::shared_ptr<ErrorHandler> errorHandler;
  std::shared_ptr<WorkletsCache> workletsCache;
  std::shared_ptr<ShareableValue> valueSetter;
  std::shared_ptr<Scheduler> scheduler;
  
  struct Th {
    std::unique_ptr<jsi::Runtime> rt;
    std::shared_ptr<std::thread> thread;
  };
  int currentThreadId = 0;
  std::unordered_map<int, std::shared_ptr<Th>> threads;
};

} // namespace reanimated
