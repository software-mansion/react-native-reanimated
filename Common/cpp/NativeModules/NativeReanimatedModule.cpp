#include "NativeReanimatedModule.h"
#include <memory>
#include "Logger.h"
#include <functional>
#include <thread>

using namespace facebook;

namespace facebook {
namespace react {

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
  std::shared_ptr<MapperRegistry> mapperRegistry,
  std::shared_ptr<JSCallInvoker> jsInvoker,
  std::shared_ptr<ErrorHandler> errorHandler) : NativeReanimatedModuleSpec(jsInvoker) {

  this->applierRegistry = ar;
  this->scheduler = scheduler;
  this->workletRegistry = wr;
  this->sharedValueRegistry = svr;
  this->mapperRegistry = mapperRegistry;
  this->runtime = std::move(rt);
  this->errorHandler = errorHandler;
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

void NativeReanimatedModule::setWorkletListener(jsi::Runtime &rt, int workletId, const jsi::Value &listener) {
  if (listener.isUndefined() or listener.isNull()) {
    scheduler->scheduleOnUI([this, workletId](){
      workletRegistry->setWorkletListener(workletId, std::shared_ptr<std::function<void()>>(nullptr));
    });
    return;
  }

  jsi::Function fun = listener.getObject(rt).asFunction(rt);
  std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));

  std::shared_ptr<std::function<void()>> wrapperFun(new std::function<void()>([this, &rt, funPtr]{
    scheduler->scheduleOnJS([&rt, funPtr]{
      funPtr->call(rt);
    });
  }));
  
  scheduler->scheduleOnUI([this, workletId, wrapperFun](){
    workletRegistry->setWorkletListener(workletId, wrapperFun);
  });
}

// SharedValue

void NativeReanimatedModule::updateSharedValueRegistry(jsi::Runtime &rt, int id, const jsi::Value &value, bool setVal) {
  std::function<std::shared_ptr<SharedValue>()> create;
  
  if (value.isNumber()) {
    std::shared_ptr<SharedValue> sv(new SharedDouble(id, value.getNumber()));
    create = [=] () {return sv;};
  } else if(value.isString()) {
    std::shared_ptr<SharedValue> sv(new SharedString(id, value.getString(rt).utf8(rt)));
    create = [=] () {return sv;};
  } else if(value.isObject()) {
    jsi::Object obj = value.getObject(rt);
    
    if (obj.hasProperty(rt, "isWorklet")) {
      int workletId = obj.getProperty(rt, "workletId").getNumber();
      
      std::vector<int> args;
      jsi::Array ar = obj.getProperty(rt, "argIds").getObject(rt).asArray(rt);
      for (int i = 0; i < ar.length(rt); ++i) {
        int svId = ar.getValueAtIndex(rt, i).getNumber();
        args.push_back(svId);
      }
      
      create = [=] () -> std::shared_ptr<SharedValue> {
        std::shared_ptr<Worklet> worklet = workletRegistry->getWorklet(workletId);
        if (worklet == nullptr) {
          return nullptr;
        }
        std::shared_ptr<SharedValue> sv(new SharedWorkletStarter(
            (int)id,
            worklet,
            args,
            this->sharedValueRegistry,
            this->applierRegistry,
            this->errorHandler));
        return sv;
      };
    }
    
    if (obj.hasProperty(rt, "isFunction")) {
      int workletId = obj.getProperty(rt, "workletId").getNumber();
      create = [=] () -> std::shared_ptr<SharedValue> {
        std::shared_ptr<Worklet> worklet = workletRegistry->getWorklet(workletId);
        if (worklet == nullptr) {
          return nullptr;
        }
        std::shared_ptr<SharedValue> sv(new SharedFunction(id, worklet));
        return sv;
      };
    };
    
    if (obj.hasProperty(rt, "isArray")) {
      std::vector<int> svIds;
      jsi::Array ar = obj.getProperty(rt, "argIds").getObject(rt).asArray(rt);
      for (int i = 0; i < ar.length(rt); ++i) {
        int svId = ar.getValueAtIndex(rt, i).getNumber();
        svIds.push_back(svId);
      }
      create = [=] () -> std::shared_ptr<SharedValue> {
        std::vector<std::shared_ptr<SharedValue>> svs;
        for (auto svId : svIds) {
          std::shared_ptr<SharedValue> sv = sharedValueRegistry->getSharedValue(svId);
          if (sv == nullptr) {
            return nullptr;
          }
          svs.push_back(sv);
        }
        std::shared_ptr<SharedValue> sv(new SharedArray(id, svs));
        return sv;
      };
    }
    
    if (obj.hasProperty(rt, "isObject")) {
      std::vector<int> svIds;
      jsi::Array ar = obj.getProperty(rt, "ids").getObject(rt).asArray(rt);
      for (int i = 0; i < ar.length(rt); ++i) {
        int svId = ar.getValueAtIndex(rt, i).getNumber();
        svIds.push_back(svId);
      }
      
      std::vector<std::string> names;
      ar = obj.getProperty(rt, "propNames").getObject(rt).asArray(rt);
      for (int i = 0; i < ar.length(rt); ++i) {
        std::string name = ar.getValueAtIndex(rt, i).getString(rt).utf8(rt);
        names.push_back(name);
      }
      
      create = [=] () -> std::shared_ptr<SharedValue> {
        std::vector<std::shared_ptr<SharedValue>> svs;
        for (auto svId : svIds) {
          std::shared_ptr<SharedValue> sv = sharedValueRegistry->getSharedValue(svId);
          if (sv == nullptr) {
            return nullptr;
          }
          svs.push_back(sv);
        }
        
        std::shared_ptr<SharedValue> sv(new SharedObject(id, svs, names));
        return sv;
      };
      
    }

  }
  
  scheduler->scheduleOnUI([=](){
    std::shared_ptr<SharedValue> oldSV = sharedValueRegistry->getSharedValue(id);
    if (oldSV != nullptr and !setVal) {
      return;
    }
    
    std::shared_ptr<SharedValue> sv = create();
    if (sv == nullptr) {
      return;
    }
    
    if (oldSV != nullptr and setVal) {
      oldSV->setNewValue(sv);
    }
    
    if (oldSV == nullptr) {
      sharedValueRegistry->registerSharedValue(id, sv);
    }
  });
}

void NativeReanimatedModule::registerSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) {
  updateSharedValueRegistry(rt, (int)id, value, false);
}

void NativeReanimatedModule::unregisterSharedValue(jsi::Runtime &rt, double id) {
  scheduler->scheduleOnUI([=](){
    sharedValueRegistry->unregisterSharedValue(id);
  });
}

void NativeReanimatedModule::getSharedValueAsync(jsi::Runtime &rt, double id, const jsi::Value &value) {
  jsi::Function fun = value.getObject(rt).asFunction(rt);
  std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));

  scheduler->scheduleOnUI([&rt, id, funPtr, this]() {
    auto sv = sharedValueRegistry->getSharedValue(id);
    scheduler->scheduleOnJS([&rt, sv, funPtr] () {
      jsi::Value val = sv->asValue(rt);
      funPtr->call(rt, val);
    });
  });

}

void NativeReanimatedModule::setSharedValue(jsi::Runtime &rt, double id, const jsi::Value &value) {
  updateSharedValueRegistry(rt, (int)id, value, true);
}

void NativeReanimatedModule::registerApplierOnRender(jsi::Runtime &rt, int id, int workletId, std::vector<int> svIds) {
  scheduler->scheduleOnUI([=]() {
    std::shared_ptr<Worklet> workletPtr = workletRegistry->getWorklet(workletId);
    if (workletPtr == nullptr) {
      return;
    }

    std::shared_ptr<Applier> applier(new Applier(id, workletPtr, svIds, this->errorHandler, sharedValueRegistry));
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
    std::shared_ptr<Worklet> workletPtr = workletRegistry->getWorklet(workletId);
    if (workletPtr == nullptr) {
      return;
    }

    std::shared_ptr<Applier> applier(new Applier(id, workletPtr, svIds, this->errorHandler, sharedValueRegistry));
    applierRegistry->registerApplierForEvent(id, eventName, applier);
   });
}

void NativeReanimatedModule::unregisterApplierFromEvent(jsi::Runtime &rt, int id) {
  scheduler->scheduleOnUI([=](){
    applierRegistry->unregisterApplierFromEvent(id);
  });
}

void NativeReanimatedModule::registerMapper(jsi::Runtime &rt, int id, int workletId, std::vector<int> svIds) {
  scheduler->scheduleOnUI([=]() {
    std::shared_ptr<Worklet> workletPtr = workletRegistry->getWorklet(workletId);
    if (workletPtr == nullptr) {
      return;
    }

    std::shared_ptr<Applier> applier(new Applier(id, workletPtr, svIds, this->errorHandler, sharedValueRegistry));
    std::shared_ptr<Mapper> mapper = Mapper::createMapper(id,
                                                          applier,
                                                          sharedValueRegistry);
    mapperRegistry->addMapper(mapper);
  });
}

void NativeReanimatedModule::unregisterMapper(jsi::Runtime &rt, int id) {
  scheduler->scheduleOnUI([=](){
    mapperRegistry->removeMapper(id);
  });
}

void NativeReanimatedModule::render() {
  std::shared_ptr<jsi::Value> event(new jsi::Value(*runtime, jsi::Value::undefined()));
  std::shared_ptr<BaseWorkletModule> ho(new WorkletModule(
    sharedValueRegistry, 
    applierRegistry, 
    workletRegistry,
    event,
    this->errorHandler));
  applierRegistry->render(*runtime, ho);
}

void NativeReanimatedModule::onEvent(std::string eventName, std::string eventAsString) {
  jsi::Value event = eval(*runtime, ("(" + eventAsString + ")").c_str());
  std::shared_ptr<jsi::Value> eventPtr(new jsi::Value(*runtime, event));
  std::shared_ptr<BaseWorkletModule> ho(new WorkletModule(
    sharedValueRegistry, 
    applierRegistry, 
    workletRegistry,
    eventPtr,
    this->errorHandler));
  applierRegistry->event(*runtime, eventName, ho);
}

NativeReanimatedModule::~NativeReanimatedModule() {
  // noop
}

// test method

/*
  used for tests
*/
void NativeReanimatedModule::getRegistersState(jsi::Runtime &rt, int option, const jsi::Value &value) {
  // option:
  //  1 - shared values
  //  2 - worklets
  //  3 - appliers
  jsi::Function fun = value.getObject(rt).asFunction(rt);
  std::shared_ptr<jsi::Function> funPtr(new jsi::Function(std::move(fun)));

  scheduler->scheduleOnUI([&rt, funPtr, this, option]() {
    std::string ids;
    switch(option) {
      case 1: {
        for(auto &it : sharedValueRegistry->getSharedValueMap()) {
          ids += std::to_string(it.first) + " ";
        }
        break;
      }
      case 2: {
        for(auto it : workletRegistry->getWorkletMap()) {
          ids += std::to_string(it.first) + " ";
        }
        break;
      }
      case 3: {
        for(auto &it : applierRegistry->getRenderAppliers()) {
          ids += std::to_string(it.first) + " ";
        }
        for(auto &it : applierRegistry->getEventMapping()) {
          ids += std::to_string(it.first) + " ";
        }
        break;
      }
      default: {
        ids = "error: registers state invalid option provided ";
      }
    }
    if (ids.size() > 0) {
      ids.pop_back();
    }
    scheduler->scheduleOnJS([&rt, ids, funPtr] () {
      funPtr->call(rt, ids.c_str());
    });
  });
}

}
}
