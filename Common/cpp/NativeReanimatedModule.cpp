#include "NativeReanimatedModule.h"
#include <memory>
#include "Logger.h"


using namespace facebook;

namespace facebook {
namespace react {

#include <android/log.h>
#define APPNAME "NATIVE_REANIMATED"

jsi::Value eval(jsi::Runtime &rt, const char *code) {
  return rt.global().getPropertyAsFunction(rt, "eval").call(rt, code);
}

jsi::Function function(jsi::Runtime &rt, const std::string& code) {
  return eval(rt, ("(" + code + ")").c_str()).getObject(rt).getFunction(rt);
}

NativeReanimatedModule::NativeReanimatedModule(
  std::unique_ptr<jsi::Runtime> rt,
  std::shared_ptr<ApplierRegistry> ar,
  std::shared_ptr<SharedValueRegistry> svr,
  std::shared_ptr<WorkletRegistry> wr,
  std::shared_ptr<Scheduler> scheduler,
  std::shared_ptr<JSCallInvoker> jsInvoker) : NativeReanimatedModuleSpec(jsInvoker) {

  this->applierRegistry = ar;
  this->scheduler = scheduler;
  this->workletRegistry = wr;
  this->sharedValueRegistry = svr;
  this->runtime = std::move(rt);
}

// worklets

void NativeReanimatedModule::registerWorklet( // make it async !!!
  jsi::Runtime &rt,
  double id,
  std::string functionAsString) {
  scheduler->scheduleOnUI([functionAsString, id, this]() mutable {
    auto fun = function(*runtime, functionAsString.c_str());
    std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));
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
    std::shared_ptr<SharedValue> sv(new SharedDouble(id, value.getNumber()));
    scheduler->scheduleOnUI([=](){
      sharedValueRegistry->registerSharedValue(id, sv);
    });
  } else if(value.isString()) {
    std::shared_ptr<SharedValue> sv(new SharedString(id, value.getString(rt).utf8(rt)));
    scheduler->scheduleOnUI([=](){
      sharedValueRegistry->registerSharedValue(id, sv);
    });
  }  // add here other types
}

void NativeReanimatedModule::unregisterSharedValue(jsi::Runtime &rt, double id) {
  scheduler->scheduleOnUI([=](){
    sharedValueRegistry->unregisterSharedValue(id);
  });
}

void NativeReanimatedModule::getSharedValueAsync(jsi::Runtime &rt, double id, const jsi::Function &cb) {
  jsi::WeakObject * fun = new jsi::WeakObject(rt, cb);
  std::shared_ptr<jsi::WeakObject> sharedFunction(fun);

  scheduler->scheduleOnUI([&rt, id, sharedFunction, this]() {
    auto sv = sharedValueRegistry->getSharedValue(id);
    scheduler->scheduleOnJS([&rt, sv, sharedFunction] () {
      jsi::Value val = sv->asValue(rt);
      jsi::Value functionVal = sharedFunction->lock(rt);
      jsi::Function cb = functionVal.asObject(rt).asFunction(rt);
      cb.call(rt, val);
    });
  });

}

void NativeReanimatedModule::setSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) {
  if (value.isNumber()) {
    std::shared_ptr<SharedValue> sv(new SharedDouble(id, value.getNumber()));
    scheduler->scheduleOnUI([=](){
      std::shared_ptr<SharedValue> oldSV = sharedValueRegistry->getSharedValue(id);
      oldSV->setNewValue(sv);
    });
  } else if(value.isString()) {
    std::shared_ptr<SharedValue> sv(new SharedString(id, value.getString(rt).utf8(rt)));
    scheduler->scheduleOnUI([=](){
       std::shared_ptr<SharedValue> oldSV = sharedValueRegistry->getSharedValue(id);
       oldSV->setNewValue(sv);
    });
  } // add here other types
}

void NativeReanimatedModule::registerApplierOnRender(jsi::Runtime &rt, int id, int workletId, std::vector<int> svIds) {
  scheduler->scheduleOnUI([=]() {
    std::shared_ptr<jsi::Function> workletPtr = workletRegistry->getWorklet(workletId);
    std::vector<std::shared_ptr<SharedValue>> svs;
    for (auto &i : svIds) {
      std::shared_ptr<SharedValue> sv = sharedValueRegistry->getSharedValue(i);
      svs.push_back(sv);
    }

    std::shared_ptr<Applier> applier(new Applier(workletPtr, svs));
    applierRegistry->registerApplierForRender(id, applier);
  });
}

void NativeReanimatedModule::unregisterApplierFromRender(jsi::Runtime &rt, int id) {
  scheduler->scheduleOnUI([=](){
    applierRegistry->unregisterApplierFromRender(id);
  });
}

void NativeReanimatedModule::registerApplierOnEvent(jsi::Runtime &rt, int id, std::string eventName, int workletId, std::vector<int> svIds) {
  scheduler->scheduleOnUI([=]() {
    std::shared_ptr<jsi::Function> workletPtr = workletRegistry->getWorklet(workletId);
    std::vector<std::shared_ptr<SharedValue>> svs;
    for (auto &i : svIds) {
      std::shared_ptr<SharedValue> sv = sharedValueRegistry->getSharedValue(i);
      svs.push_back(sv);
    }

    std::shared_ptr<Applier> applier(new Applier(workletPtr, svs));
    applierRegistry->registerApplierForEvent(id, eventName, applier);
   });
}

void NativeReanimatedModule::unregisterApplierFromEvent(jsi::Runtime &rt, int id) {
  scheduler->scheduleOnUI([=](){
    applierRegistry->unregisterApplierFromEvent(id);
  });
}

void NativeReanimatedModule::render() {
  std::shared_ptr<jsi::Value> event(new jsi::Value(*runtime, jsi::Value::undefined()));
  std::shared_ptr<jsi::HostObject> ho(new WorkletModule(sharedValueRegistry, applierRegistry, workletRegistry, event));
  applierRegistry->render(*runtime, ho);
}

void NativeReanimatedModule::onEvent(std::string eventName, std::string eventAsString) {
  jsi::Value event = eval(*runtime, ("(" + eventAsString + ")").c_str());
  std::shared_ptr<jsi::Value> eventPtr(new jsi::Value(*runtime, event));
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "onEvent");
  std::shared_ptr<jsi::HostObject> ho(new WorkletModule(sharedValueRegistry, applierRegistry, workletRegistry, eventPtr));
  applierRegistry->event(*runtime, eventName, ho);
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
