#include "NativeReanimatedModule.h"
#include <memory>

#define APPNAME "NATIVE_REANIMATED"

using namespace facebook;

namespace facebook {
namespace react {

std::string fun = "";


#include <android/log.h>
#define APPNAME "NATIVE_REANIMATED"

NativeReanimatedModule::NativeReanimatedModule(std::shared_ptr<SharedValueRegistry> svr, std::shared_ptr<WorkletRegistry> wr, std::shared_ptr<Scheduler> scheduler, std::shared_ptr<JSCallInvoker> jsInvoker) : NativeReanimatedModuleSpec(jsInvoker) {
  this->scheduler = scheduler;
  this->workletRegistry = wr;
  this->sharedValueRegistry = svr;
}

// worklets

void NativeReanimatedModule::registerWorklet( // make it async !!!
  jsi::Runtime &rt,
  double id,
  const jsi::String &arg) {
  std::string functionName = arg.utf8(rt);
  jsi::Function fun = rt.global().getPropertyAsFunction(rt, functionName.c_str());
  std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));
  scheduler->scheduleOnUI([funPtr, id, this]() mutable {
    this->workletRegistry->registerWorklet((int)id, funPtr);
  });
}

void NativeReanimatedModule::unregisterWorklet( // make it async !!!
  jsi::Runtime &rt,
  double id) {
  scheduler->scheduleOnUI([id, this]() mutable {
    this->workletRegistry->unregisterWorklet((int)id);
  });
}

// SharedValue

void NativeReanimatedModule::registerSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) {
  if (value.isNumber()) {
    std::shared_ptr<SharedValue> sv(new SharedDouble(value.getNumber()));
    scheduler->scheduleOnUI([=](){
      sharedValueRegistry->registerSharedValue(id, sv);
    });
  } // add here other types
}

void NativeReanimatedModule::unregisterSharedValue(jsi::Runtime &rt, double id) {
  scheduler->scheduleOnUI([=](){
    sharedValueRegistry->unregisterSharedValue(id);
  });
}

jsi::Value NativeReanimatedModule::getSharedValueAsync(jsi::Runtime &rt, double id) {
  return createPromiseAsJSIValue(rt, [id, this](jsi::Runtime &rt2, std::shared_ptr<jsi::Promise> promise) {
    scheduler->scheduleOnUI([&rt2, promise, id, this]() {
      auto sv = sharedValueRegistry->getSharedValue(id);
      scheduler->scheduleOnJS([&rt2, promise, this]) {
        jsi::Value val = sv.asValue(rt2);
        promise->resolve(val);
      }
    });
  });
}

void NativeReanimatedModule::setSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) {
  if (value.isNumber()) {
    std::shared_ptr<SharedValue> sv(new SharedDouble(value.getNumber()));
    scheduler->scheduleOnUI([=](){
      std::shared_ptr<SharedValue> oldSV = sharedValueRegistry->getSharedValue(id);
      oldSV->setNewSharedValue(sv);
    });
  } // add here other types
}

// test method

void NativeReanimatedModule::call(
  jsi::Runtime &rt,
  const jsi::Function &callback) {

  jsi::WeakObject * fun = new jsi::WeakObject(rt, callback);
  std::shared_ptr<jsi::WeakObject> sharedFunction(fun);

  scheduler->scheduleOnUI([&rt, sharedFunction, this] () mutable {
     __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "resultt OK");
     scheduler->scheduleOnJS([&rt, sharedFunction] () mutable {
        __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "resultt2 OK");
        jsi::Value val = sharedFunction->lock(rt);
        jsi::Function cb = val.asObject(rt).asFunction(rt);
        cb.call(rt,  jsi::String::createFromUtf8(rt, "natywny string dla callback-a"));
     });
  });
  /*scheduler->scheduleOnJS([] () mutable {
    __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "resultt2 OK");
  });
  callback.call(rt,  jsi::String::createFromUtf8(rt, "natywny string dla callback-a"));*/
}

}
}
