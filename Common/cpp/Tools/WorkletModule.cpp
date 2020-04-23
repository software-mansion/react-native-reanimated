//
// Created by Szymon Kapala on 2020-02-13.
//

#include "WorkletModule.h"
#include "Logger.h"

WorkletModule::WorkletModule(std::shared_ptr<SharedValueRegistry> sharedValueRegistry,
                                   std::shared_ptr<ApplierRegistry> applierRegistry,
                                   std::shared_ptr<WorkletRegistry> workletRegistry,
                                   std::shared_ptr<jsi::Value> event,
                                   std::shared_ptr<ErrorHandler> errorHandler) {
  this->sharedValueRegistry = sharedValueRegistry;
  this->applierRegistry = applierRegistry;
  this->workletRegistry = workletRegistry;
  this->event = event;
  this->workletId = -1;
  this->errorHandler = errorHandler;
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
      const jsi::Value *value = &args[0];
      if (value->isString()) {
        Logger::log(value->getString(rt).utf8(rt).c_str());
      } else if (value->isNumber()) {
        Logger::log(value->getNumber());
      } else if (value->isBool()){
        Logger::log(value->getBool());
      } else {
        Logger::log("unsupported value type");
      }
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

      if (this->workletRegistry->getWorklet(workletId)->listener != nullptr) {
        (*this->workletRegistry->getWorklet(workletId)->listener)();
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
  } else {
    std::string message = "unknown prop called on worklet object: ";
    message += propName;
    this->errorHandler->raise(message.c_str());
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
