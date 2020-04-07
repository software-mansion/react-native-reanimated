//
// Created by Szymon Kapala on 2020-02-13.
//

#include "WorkletModule.h"
#include "Logger.h"
#include "SharedObject.h"
#include "SharedArray.h"

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
    auto callback = [this](
        jsi::Runtime &rt,
        const jsi::Value &thisValue,
        const jsi::Value *args,
        size_t count
        ) -> jsi::Value {
        const jsi::Value *value = &args[0];
      Logger::log(this->getStringRepresentation(rt, value).c_str());
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

std::string WorkletModule::getStringRepresentation(jsi::Runtime &rt, const jsi::Value *value) {
  if (value->isString()) {
    return value->getString(rt).utf8(rt);
  } else if (value->isNumber()) {
    return std::to_string(value->getNumber());
  }  else if (value->isObject()) {
      jsi::Object obj = value->getObject(rt);
      jsi::Value id = obj.getProperty(rt, "id");
      std::string type = obj.getProperty(rt, "type").getString(rt).utf8(rt);
      std::string result;
      if (type == "array") {
          result = "[";
          std::shared_ptr<SharedValue> sharedArray = sharedValueRegistry->getSharedValue(id.getNumber());
          for (auto & item : (std::dynamic_pointer_cast<SharedArray>(sharedArray))->getSvs()) {
              jsi::Value value = item->asValue(rt);
              result += getStringRepresentation(rt, &value) + ",";
          }
          result[result.size() - 1] = ']';
      } else if (type == "object") {
          result = "{";
          std::shared_ptr<SharedValue> sharedObject = sharedValueRegistry->getSharedValue(id.getNumber());
          for (auto & pair : (std::dynamic_pointer_cast<SharedObject>(sharedObject))->getProperties()) {
              std::string label = pair.first;
              result += label + ":";
              std::shared_ptr<SharedValue> sv = pair.second;
              jsi::Value val = sv->asValue(rt);
              // for asValue() reading properties such as id or type does not work in further recursion
              if (val.isObject()) {
                  val = sv->asParameter(rt);
              }
              result += getStringRepresentation(rt, &val) + ",";
          }
          result[result.size() - 1] = '}';
      } else {
          result = "unsupported type";
      }
      return result;
  }
  return "unsupported value type";
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
