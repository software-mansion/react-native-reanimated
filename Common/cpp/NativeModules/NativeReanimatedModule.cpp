#include "NativeReanimatedModule.h"
#include "Logger.h"
#include "SpeedChecker.h"
#include "ShareableValue.h"
#include "MapperRegistry.h"
#include "Mapper.h"
#include "RuntimeDecorator.h"
#include "EventHandlerRegistry.h"
#include "EventHandler.h"
#include "FrozenObject.h"
#include <functional>
#include <thread>
#include <future>
#include <memory>
#include "JSIStoreValueUser.h"

using namespace facebook;

namespace reanimated
{

void extractMutables(jsi::Runtime &rt,
                     std::shared_ptr<ShareableValue> sv,
                     std::vector<std::shared_ptr<MutableValue>> &res)
{
  switch (sv->type)
  {
  case ValueType::MutableValueType:
    res.push_back(sv->mutableValue);
    break;
  case ValueType::ArrayType:
    for (auto &it : sv->frozenArray)
    {
      extractMutables(rt, it, res);
    }
    break;
  case ValueType::RemoteObjectType:
  case ValueType::ObjectType:
    for (auto &it : sv->frozenObject->map)
    {
      extractMutables(rt, it.second, res);
    }
    break;
  default:
    break;
  }
}

std::vector<std::shared_ptr<MutableValue>> extractMutablesFromArray(jsi::Runtime &rt, const jsi::Array &array, NativeReanimatedModule *module)
{
  std::vector<std::shared_ptr<MutableValue>> res;
  for (size_t i = 0, size = array.size(rt); i < size; i++)
  {
    auto shareable = ShareableValue::adapt(rt, array.getValueAtIndex(rt, i), module);
    extractMutables(rt, shareable, res);
  }
  return res;
}

NativeReanimatedModule::NativeReanimatedModule(std::shared_ptr<CallInvoker> jsInvoker,
                                               std::shared_ptr<Scheduler> scheduler,
                                               std::unique_ptr<jsi::Runtime> rt,
                                               std::shared_ptr<ErrorHandler> errorHandler,
                                               std::function<jsi::Value(jsi::Runtime &, const int, const jsi::String &)> propObtainer,
                                               PlatformDepMethodsHolder platformDepMethodsHolder,
                                               std::function<std::unique_ptr<jsi::Runtime>()> runtimeObtainer) : NativeReanimatedModuleSpec(jsInvoker),
                                                  runtime(std::move(rt)),
                                                  mapperRegistry(new MapperRegistry()),
                                                  eventHandlerRegistry(new EventHandlerRegistry()),
                                                  requestRender(platformDepMethodsHolder.requestRender),
                                                  propObtainer(propObtainer),
                                                  errorHandler(errorHandler),
                                                  workletsCache(new WorkletsCache()),
                                                  scheduler(scheduler),
                                                  runtimeObtainer(runtimeObtainer)
{
  auto requestAnimationFrame = [=](FrameCallback callback) {
    frameCallbacks.push_back(callback);
    maybeRequestRender();
  };

  RuntimeDecorator::addNativeObjects(*runtime,
                                     platformDepMethodsHolder.updaterFunction,
                                     requestAnimationFrame,
                                     platformDepMethodsHolder.scrollToFunction,
                                     platformDepMethodsHolder.measuringFunction,
                                     platformDepMethodsHolder.getCurrentTime);
}

bool NativeReanimatedModule::isUIRuntime(jsi::Runtime &rt)
{
  return runtime.get() == &rt;
}

bool NativeReanimatedModule::isHostRuntime(jsi::Runtime &rt)
{
  return !isUIRuntime(rt);
}

void NativeReanimatedModule::installCoreFunctions(jsi::Runtime &rt, const jsi::Value &valueSetter)
{
  this->valueSetter = ShareableValue::adapt(rt, valueSetter, this);
}

jsi::Value NativeReanimatedModule::makeShareable(jsi::Runtime &rt, const jsi::Value &value)
{
  return ShareableValue::adapt(rt, value, this)->getValue(rt);
}

jsi::Value NativeReanimatedModule::makeMutable(jsi::Runtime &rt, const jsi::Value &value)
{
  return ShareableValue::adapt(rt, value, this, ValueType::MutableValueType)->getValue(rt);
}

jsi::Value NativeReanimatedModule::makeRemote(jsi::Runtime &rt, const jsi::Value &value)
{
  return ShareableValue::adapt(rt, value, this, ValueType::RemoteObjectType)->getValue(rt);
}

jsi::Value NativeReanimatedModule::startMapper(jsi::Runtime &rt, const jsi::Value &worklet, const jsi::Value &inputs, const jsi::Value &outputs)
{
  static unsigned long MAPPER_ID = 1;

  unsigned long newMapperId = MAPPER_ID++;
  auto mapperShareable = ShareableValue::adapt(rt, worklet, this);
  auto inputMutables = extractMutablesFromArray(rt, inputs.asObject(rt).asArray(rt), this);
  auto outputMutables = extractMutablesFromArray(rt, outputs.asObject(rt).asArray(rt), this);

  scheduler->scheduleOnUI([=] {
    auto mapperFunction = mapperShareable->getValue(*runtime).asObject(*runtime).asFunction(*runtime);
    std::shared_ptr<jsi::Function> mapperFunctionPointer = std::make_shared<jsi::Function>(std::move(mapperFunction));
    std::shared_ptr<Mapper> mapperPointer = std::make_shared<Mapper>(this, newMapperId, mapperFunctionPointer, inputMutables, outputMutables);
    mapperRegistry->startMapper(mapperPointer);
    maybeRequestRender();
  });

  return jsi::Value((double)newMapperId);
}

void NativeReanimatedModule::stopMapper(jsi::Runtime &rt, const jsi::Value &mapperId)
{
  unsigned long id = mapperId.asNumber();
  scheduler->scheduleOnUI([=] {
    mapperRegistry->stopMapper(id);
    maybeRequestRender();
  });
}

jsi::Value NativeReanimatedModule::registerEventHandler(jsi::Runtime &rt, const jsi::Value &eventHash, const jsi::Value &worklet)
{
  static unsigned long EVENT_HANDLER_ID = 1;

  unsigned long newRegistrationId = EVENT_HANDLER_ID++;
  auto eventName = eventHash.asString(rt).utf8(rt);
  auto handlerShareable = ShareableValue::adapt(rt, worklet, this);

  scheduler->scheduleOnUI([=] {
    auto handlerFunction = handlerShareable->getValue(*runtime).asObject(*runtime).asFunction(*runtime);
    auto handler = std::make_shared<EventHandler>(newRegistrationId, eventName, std::move(handlerFunction));
    eventHandlerRegistry->registerEventHandler(handler);
  });

  return jsi::Value((double)newRegistrationId);
}

void NativeReanimatedModule::unregisterEventHandler(jsi::Runtime &rt, const jsi::Value &registrationId)
{
  unsigned long id = registrationId.asNumber();
  scheduler->scheduleOnUI([=] {
    eventHandlerRegistry->unregisterEventHandler(id);
  });
}

jsi::Value NativeReanimatedModule::getViewProp(jsi::Runtime &rt, const jsi::Value &viewTag, const jsi::Value &propName, const jsi::Value &callback)
{

  const int viewTagInt = (int)viewTag.asNumber();
  std::string propNameStr = propName.asString(rt).utf8(rt);
  jsi::Function fun = callback.getObject(rt).asFunction(rt);
  std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));

  scheduler->scheduleOnUI([&rt, viewTagInt, funPtr, this, propNameStr]() {
    const jsi::String propNameValue = jsi::String::createFromUtf8(rt, propNameStr);
    jsi::Value result = propObtainer(rt, viewTagInt, propNameValue);
    std::string resultStr = result.asString(rt).utf8(rt);

    scheduler->scheduleOnJS([&rt, resultStr, funPtr]() {
      const jsi::String resultValue = jsi::String::createFromUtf8(rt, resultStr);
      funPtr->call(rt, resultValue);
    });
  });

  return jsi::Value::undefined();
}

jsi::Value NativeReanimatedModule::spawnThread(jsi::Runtime &rt, const jsi::Value &operations) {
  Logger::log("HERE spawning thread...");
  jsi::Object object = operations.asObject(rt);
  if (object.isFunction(rt)) {
    if (!object.getProperty(rt, "__worklet").isUndefined()) {

      const size_t thread_id = std::hash<std::thread::id>{}(std::this_thread::get_id());
      std::string str = "here 1 thread id: ";
      str += std::to_string(thread_id);
      Logger::log(str.c_str());
        
      std::unique_ptr<jsi::Runtime> customRuntime = runtimeObtainer();
        
      std::string strutf8 = object.getProperty(rt, "asString").asString(rt).utf8(rt);
        jsi::String jsis = jsi::String::createFromUtf8(*customRuntime, strutf8);
        jsi::Value v(*customRuntime , jsis);
        std::shared_ptr<jsi::StringBuffer> buf = std::make_shared<jsi::StringBuffer>(strutf8);
        //jsi::Value val = customRuntime->evaluateJavaScript(buf, "experimental_call");
        
        auto customGlobal = customRuntime->global();//.getPropertyAsFunction(rt, "eval");
        auto global = rt.global();
        
        auto arr1 = global.getPropertyNames(rt);
        auto arr2 = customGlobal.getPropertyNames(*customRuntime);
        
        // ...there's no eval on custom global... :/
        
        //jsi::Object o = v.getObject(*customRuntime); // error
        // auto pureCxxFun = object.asFunction(rt).getHostFunction(rt); // not working
      
      //jsi::Function jsiFunction = object.asFunction(*customRuntime); // error
      //jsi::Function fff = jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "customFunc"), 0, warnFunction);
        volatile int x = 9;
/*
        jsi::Value val(std::move(operations));
        volatile int x = 9;
      //Logger::log("calling worklet");
      //jsiFunction.call(rt, jsi::Value::undefined());
/*
      auto fun = [&rt, &jsiFunction]() -> void {
        const size_t thread_id2 = std::hash<std::thread::id>{}(std::this_thread::get_id());
        std::string str = "here 2 thread id: ";
        str += std::to_string(thread_id2);
        Logger::log(str.c_str());
        // ...

        jsiFunction.call(rt, jsi::Value::undefined());
      };
      //std::thread t1(fun);
        //t1.join();
      std::async(fun);
      */
    }
  }
  /*
  auto fun = [&rt, &thisValue, &res]() -> void {
    const size_t thread_id2 = std::hash<std::thread::id>{}(std::this_thread::get_id());
    std::string str = "here 2 thread id: ";
    str += std::to_string(thread_id2);
    Logger::log(str.c_str());
    // ...
  };
  std::thread t1(fun);
  */
    return jsi::Value::undefined();
}

void NativeReanimatedModule::onEvent(std::string eventName, std::string eventAsString)
{
   try
    {
      eventHandlerRegistry->processEvent(*runtime, eventName, eventAsString);
      mapperRegistry->execute(*runtime);
      if (mapperRegistry->needRunOnRender())
      {
        maybeRequestRender();
      }
    }
    catch (...)
    {
      if (!errorHandler->raise())
      {
        throw;
      }
    }
}

bool NativeReanimatedModule::isAnyHandlerWaitingForEvent(std::string eventName) {
  return eventHandlerRegistry->isAnyHandlerWaitingForEvent(eventName);
}


void NativeReanimatedModule::maybeRequestRender()
{
  if (!renderRequested)
  {
    renderRequested = true;
    requestRender([this](double timestampMs) {
      this->renderRequested = false;
      this->onRender(timestampMs);
    }, *this->runtime);
  }
}

void NativeReanimatedModule::onRender(double timestampMs)
{
  try
  {
    std::vector<FrameCallback> callbacks = frameCallbacks;
    frameCallbacks.clear();
    for (auto callback : callbacks)
    {
      callback(timestampMs);
    }
    mapperRegistry->execute(*runtime);

    if (mapperRegistry->needRunOnRender())
    {
      maybeRequestRender();
    }
  }
  catch (...)
  {
    if (!errorHandler->raise())
    {
      throw;
    }
  }
}

NativeReanimatedModule::~NativeReanimatedModule()
{
  StoreUser::clearStore();
}

} // namespace reanimated
