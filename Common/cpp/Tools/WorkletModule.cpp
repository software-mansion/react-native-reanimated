//
// Created by Szymon Kapala on 2020-02-13.
//

#include "WorkletModule.h"
#include "Logger.h"

WorkletModule::WorkletModule(std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
                                   std::shared_ptr<ApplierRegistry> applierRegistry,
                                   std::shared_ptr<WorkletRegistry> workletRegistry,
                                   std::shared_ptr<jsi::Value> event) {
  this->sharedValueRegistry = sharedValueRegistry;
  this->applierRegistry = applierRegistry;
  this->workletRegistry = workletRegistry;
  this->event = event;
  this->workletId = -1;
}

jsi::Value WorkletModule::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
  auto propName = name.utf8(rt);
  if (propName == "event") {
    return event->getObject(rt).getProperty(rt, "NativeMap");
  } else if (propName == "log") {
    auto callback = [](
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        size_t count
        ) -> jsi::Value {
      rt.global().getProperty(rt, "_log").getObject(rt).asFunction(rt).call(rt, args, count);
      return jsi::Value::undefined();
    };
    return jsi::Function::createFromHostFunction(rt, name, 1, callback);
  } else if(propName == "notify") {
    auto callback = [this](
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        size_t count
        ) -> jsi::Value {

      if (this->workletRegistry.lock()->getWorklet(workletId)->listener != nullptr) {
        (*this->workletRegistry.lock()->getWorklet(workletId)->listener)();
      }

      return jsi::Value::undefined();
    };
    return jsi::Function::createFromHostFunction(rt, name, 0, callback);
  } else if(propName == "workletId") {
    return jsi::Value(workletId);
  } else if(propName == "applierId") {
    return jsi::Value(applierId);
  } else if(propName == "justStarted") {
    return jsi::Value(justStarted);
  } 

  return jsi::Value::undefined();
}

void WorkletModule::setEvent(std::shared_ptr<jsi::Value> event) {
  this->event = event;
}

void WorkletModule::setWorkletId(int workletId) {
  this->workletId = workletId;
}

void WorkletModule::setApplierId(int applierId) {
  this->applierId = applierId;
}

void WorkletModule::setJustStarted(bool justStarted) {
  this->justStarted = justStarted;
}
