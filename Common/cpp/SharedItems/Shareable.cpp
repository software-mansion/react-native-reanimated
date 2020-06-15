#include "Shareable.h"
#include "NativeReanimatedModule.h"
#include "Logger.h"

namespace reanimated {

void ShareableValue::adaptCache(jsi::Runtime &rt, const jsi::Value &value) {
  // when adapting from host object we can assign cached value immediately such that we avoid
  // running `toJSValue` in the future when given object is accessed
  if (module->isUIRuntime(rt)) {
    remoteValue = std::make_unique<jsi::Value>(rt, value);
  } else {
    hostValue = std::make_unique<jsi::Value>(rt, value);
  }
}

void ShareableValue::adapt(jsi::Runtime &rt, const jsi::Value &value, ValueType objectType) {
  if (objectType == MutableValueType) {
    type = MutableValueType;
    mutableValue = std::make_shared<MutableValue>(rt, value, module);
  } else if (value.isUndefined()) {
    type = UndefinedType;
  } else if (value.isNull()) {
    type = NullType;
  } else if (value.isBool()) {
    type = BoolType;
    boolValue = value.getBool();
  } else if (value.isNumber()) {
    type = NumberType;
    numberValue = value.asNumber();
  } else if (value.isString()) {
    type = StringType;
    stringValue = value.asString(rt).utf8(rt);
  } else if (value.isObject()) {
    auto object = value.asObject(rt);
    if (object.isFunction(rt)) {
      if (object.getProperty(rt, "__worklet").isUndefined()) {
        // not a worklet, we treat this as a host function
        type = HostFunctionType;
        hostRuntime = &rt;
        hostFunction = std::make_shared<jsi::Function>(object.asFunction(rt));
      } else {
        // a worklet
        type = WorkletFunctionType;
        frozenObject = std::make_shared<FrozenObject>(rt, object, module);
      }
    } else if (object.isArray(rt)) {
      type = ArrayType;
      auto array = object.asArray(rt);
      for (size_t i = 0, size = array.size(rt); i < size; i++) {
        frozenArray.push_back(adapt(rt, array.getValueAtIndex(rt, i), module));
      }
    } else if (object.isHostObject<MutableValue>(rt)) {
      type = MutableValueType;
      mutableValue = object.getHostObject<MutableValue>(rt);
      adaptCache(rt, value);
    } else if (object.isHostObject<RemoteObject>(rt)) {
      type = RemoteObjectType;
      remoteObject = object.getHostObject<RemoteObject>(rt);
      adaptCache(rt, value);
    } else if (object.isHostObject<FrozenObject>(rt)) {
      type = ObjectType;
      frozenObject = object.getHostObject<FrozenObject>(rt);
      adaptCache(rt, value);
    } else if (objectType == RemoteObjectType) {
      type = RemoteObjectType;
      remoteObject = std::make_shared<RemoteObject>(rt, object, module);
    } else {
      // create frozen object based on a copy of a given object
      type = ObjectType;
      frozenObject = std::make_shared<FrozenObject>(rt, object, module);
    }
  } else {
    throw "Invalid value type";
  }
}

std::shared_ptr<ShareableValue> ShareableValue::adapt(jsi::Runtime &rt, const jsi::Value &value, NativeReanimatedModule *module, ValueType valueType) {
  auto sv = std::shared_ptr<ShareableValue>(new ShareableValue(module));
  sv->adapt(rt, value, valueType);
  return sv;
}

jsi::Value ShareableValue::getValue(jsi::Runtime &rt) {
  // TODO: maybe we can cache toJSValue results on a per-runtime basis, need to avoid ref loops
  if (module->isUIRuntime(rt)) {
    if (remoteValue.get() == nullptr) {
      remoteValue = std::make_unique<jsi::Value>(rt, toJSValue(rt));
    }
    return jsi::Value(rt, *remoteValue);
  } else {
    if (hostValue.get() == nullptr) {
      hostValue = std::make_unique<jsi::Value>(rt, toJSValue(rt));
    }
    return jsi::Value(rt, *hostValue);
  }
  return toJSValue(rt);
}

jsi::Object ShareableValue::createHost(jsi::Runtime &rt, std::shared_ptr<jsi::HostObject> host) {
  return jsi::Object::createFromHostObject(rt, host);
}

jsi::Value ShareableValue::toJSValue(jsi::Runtime &rt) {
  switch (type) {
    case UndefinedType:
      return jsi::Value::undefined();
    case NullType:
      return jsi::Value::null();
    case BoolType:
      return jsi::Value(boolValue);
    case NumberType:
      return jsi::Value(numberValue);
    case StringType:
      return jsi::Value(rt, jsi::String::createFromAscii(rt, stringValue));
    case ObjectType:
      return createHost(rt, frozenObject);
    case ArrayType: {
      jsi::Array array(rt, frozenArray.size());
      for (size_t i = 0; i < frozenArray.size(); i++) {
        array.setValueAtIndex(rt, i, frozenArray[i]->toJSValue(rt));
      }
      return array;
    }
    case RemoteObjectType:
      if (module->isUIRuntime(rt)) {
        remoteObject->maybeInitializeOnUIRuntime(rt);
      }
      return createHost(rt, remoteObject);
    case MutableValueType:
      return createHost(rt, mutableValue);
    case HostFunctionType:
      if (hostRuntime == &rt) {
        // function is accessed from the same runtime it was crated, we just return same function obj
        return jsi::Value(rt, *hostFunction);
      } else {
        // function is accessed from a different runtme, we wrap function in host func that'd enqueue
        // call on an appropriate thread
        auto module = this->module;
        auto hostFunction = this->hostFunction;
        auto hostRuntime = this->hostRuntime;
        auto clb = [module, hostFunction, hostRuntime](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count
            ) -> jsi::Value {
          // TODO: we should find thread based on runtime such that we could also call UI methods
          // from RN and not only RN methods from UI
          
          std::vector<std::shared_ptr<ShareableValue>> params;
          for (int i = 0; i < count; ++i) {
            params.push_back(ShareableValue::adapt(rt, args[i], module));
          }
          
          std::function<void()> job = [hostFunction, hostRuntime, params] {
            jsi::Value * args = new jsi::Value[params.size()];
            for (int i = 0; i < params.size(); ++i) {
              args[i] = params[i]->getValue(*hostRuntime);
            }
             
            jsi::Value returnedValue;
             
            returnedValue = hostFunction->call(*hostRuntime,
                                              static_cast<const jsi::Value*>(args),
                                              (size_t)params.size());
             
            delete [] args;
             // ToDo use returned value to return promise
          };
          
          module->scheduler->scheduleOnJS(job);
          return jsi::Value::undefined();
        };
        return jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "hostFunction"), 0, clb);
      }
    case WorkletFunctionType:
      auto module = this->module;
      auto frozenObject = this->frozenObject;
      if (module->isUIRuntime(rt)) {
        // when running on UI thread we prep a function

        auto jsThis = frozenObject->shallowClone(*module->runtime);
        std::shared_ptr<jsi::Function> funPtr(module->workletsCache->getFunction(rt, frozenObject));
        
        // HACK ALERT: there is a special case of "setter" function where we don't want to pass
        // closure as "this". Here we handle that case separately;
        if (module->valueSetter.get() == this) {
          return jsi::Value(rt, *funPtr);
        }

        auto clb = [=](
                   jsi::Runtime &rt,
                   const jsi::Value &thisValue,
                   const jsi::Value *args,
                   size_t count
                   ) mutable -> jsi::Value {
          return funPtr->callWithThis(rt, *jsThis, args, count);
        };
        return jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "workletFunction"), 0, clb);
      } else {
        // when run outside of UI thread we enqueue a call on the UI thread
        auto retain_this = shared_from_this();
        auto clb = [retain_this = std::move(retain_this)](
            jsi::Runtime &rt,
            const jsi::Value &thisValue,
            const jsi::Value *args,
            size_t count
            ) -> jsi::Value {
          // TODO: we should find thread based on runtime such that we could also call UI methods
          // from RN and not only RN methods from UI
          
          auto module = retain_this->module;

          std::vector<std::shared_ptr<ShareableValue>> params;
          for (int i = 0; i < count; ++i) {
            params.push_back(ShareableValue::adapt(rt, args[i], module));
          }
          
          module->scheduler->scheduleOnUI([retain_this, params] {
            jsi::Runtime &rt = *retain_this->module->runtime.get();
            auto jsThis = retain_this->createHost(rt, retain_this->frozenObject);
            auto code = jsThis.getProperty(rt, "asString").asString(rt).utf8(rt);
            std::shared_ptr<jsi::Function> funPtr(retain_this->module->workletsCache->getFunction(rt, retain_this->frozenObject));
            
            jsi::Value * args = new jsi::Value[params.size()];
            for (int i = 0; i < params.size(); ++i) {
              args[i] = params[i]->getValue(rt);
            }
            
            jsi::Value returnedValue;
            
            returnedValue = funPtr->callWithThis(rt,
                                             jsThis,
                                             static_cast<const jsi::Value*>(args),
                                             (size_t)params.size());
            
            delete [] args;
            // ToDo use returned value to return promise
          });
          return jsi::Value::undefined();
        };
        return jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "workletFunction"), 0, clb);
      }
  }
  throw "convert error";
}

void MutableValueSetterProxy::set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &newValue) {
  auto propName = name.utf8(rt);
  if (propName == "value") {
    // you call `this.value` inside of value setter, we should throw
  } else if (propName == "_value") {
    mutableValue->setValue(rt, newValue);
  } else if (propName == "_animation") {
    // TODO: assert to allow animation to be set from UI only
    mutableValue->animation = jsi::Value(rt, newValue);
  }
}

jsi::Value MutableValueSetterProxy::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
  auto propName = name.utf8(rt);

  if (propName == "value") {
    return mutableValue->getValue(rt);
  } else if (propName == "_value") {
    return mutableValue->getValue(rt);
  } else if (propName == "_animation") {
    return jsi::Value(rt, mutableValue->animation);
  }

  return jsi::Value::undefined();
}

void MutableValue::setValue(jsi::Runtime &rt, const jsi::Value &newValue) {
  std::lock_guard<std::mutex> lock(readWriteMutex);
  value = ShareableValue::adapt(rt, newValue, module);
  module->scheduler->scheduleOnUI([this] {
    for (auto listener : listeners) {
      listener.second();
    }
  });
}

jsi::Value MutableValue::getValue(jsi::Runtime &rt) {
  std::lock_guard<std::mutex> lock(readWriteMutex);
  return value->getValue(rt);
}

void MutableValue::set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &newValue) {
  auto propName = name.utf8(rt);

  if (module->isHostRuntime(rt)) {
    if (propName == "value") {
      {
        std::lock_guard<std::mutex> lock(readWriteMutex);
        value = ShareableValue::adapt(rt, newValue, module);
      }
      module->scheduler->scheduleOnUI([this] {
        for (auto listener : listeners) {
          listener.second();
        }
      });
    }
    return;
  }

  // UI thread
  if (propName == "value") {
    auto setterProxy = jsi::Object::createFromHostObject(rt, std::make_shared<MutableValueSetterProxy>(shared_from_this()));
    module->valueSetter->getValue(rt)
      .asObject(rt)
      .asFunction(rt)
      .callWithThis(rt, setterProxy, newValue);
  } else if (propName == "_animation") {
    // TODO: assert to allow animation to be set from UI only
    animation = jsi::Value(rt, newValue);
  }
}

jsi::Value MutableValue::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
  auto propName = name.utf8(rt);

  if (propName == "value") {
    return getValue(rt);
  }

  if (module->isUIRuntime(rt)) {
    // _value and _animation should be accessed from UI only
    if (propName == "_value") {
      return getValue(rt);
    } else if (propName == "_animation") {
      // TODO: assert to allow animation to be read from UI onlu
      return jsi::Value(rt, animation);
    }
  }

  return jsi::Value::undefined();
}

MutableValue::MutableValue(jsi::Runtime &rt, const jsi::Value &initial, NativeReanimatedModule *module):
module(module), value(ShareableValue::adapt(rt, initial, module)) {}

unsigned long int MutableValue::addListener(std::function<void ()> listener) {
  unsigned long id = listeners.size() + 1;
  listeners.push_back(std::make_pair(id, listener));
  return id;
}

void MutableValue::removeListener(unsigned long listenerId) {
  listeners.erase(std::remove_if(listeners.begin(), listeners.end(), [=](const std::pair<unsigned long, std::function<void()>>& pair) {
    return pair.first == listenerId;
  }), listeners.end());
}

FrozenObject::FrozenObject(jsi::Runtime &rt, const jsi::Object &object, NativeReanimatedModule *module) {
  auto propertyNames = object.getPropertyNames(rt);
  for (size_t i = 0, count = propertyNames.size(rt); i < count; i++) {
    auto propertyName = propertyNames.getValueAtIndex(rt, i).asString(rt);
    map[propertyName.utf8(rt)] = ShareableValue::adapt(rt, object.getProperty(rt, propertyName), module);
  }
}

std::shared_ptr<jsi::Object> FrozenObject::shallowClone(jsi::Runtime &rt) {
  std::shared_ptr<jsi::Object> object(new jsi::Object(rt));
  for (auto prop : map) {
    object->setProperty(rt, jsi::String::createFromUtf8(rt, prop.first), prop.second->getValue(rt));
  }
  return object;
}

jsi::Value FrozenObject::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
  auto propName = name.utf8(rt);
  if (propName == "$$typeof") {
    return jsi::Value(rt, jsi::String::createFromAscii(rt, "object"));
  } else if (propName == "Symbol.toStringTag") {
    return jsi::Value(rt, jsi::String::createFromAscii(rt, "FrozenObject"));
  }
  auto found = map.find(propName);
  return found == map.end() ? jsi::Value::undefined() : found->second->getValue(rt);
}

std::vector<jsi::PropNameID> FrozenObject::getPropertyNames(jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> result;
  for (auto it = map.begin(); it != map.end(); it++) {
    result.push_back(jsi::PropNameID::forUtf8(rt, it->first));
  }
  return result;
}

void RemoteObject::maybeInitializeOnUIRuntime(jsi::Runtime &rt) {
  if (initializer.get() != nullptr) {
    backing = initializer->shallowClone(rt);
    initializer = nullptr;
  }
}

jsi::Value RemoteObject::get(jsi::Runtime &rt, const jsi::PropNameID &name) {
  if (module->isUIRuntime(rt)) {
    return backing->getProperty(rt, name);
  }
  return jsi::Value::undefined();
}

void RemoteObject::set(jsi::Runtime &rt, const jsi::PropNameID &name, const jsi::Value &value) {
  if (module->isUIRuntime(rt)) {
    backing->setProperty(rt, name, value);
  }
  // TODO: we should throw if trying to update remote from host runtime
}

std::vector<jsi::PropNameID> RemoteObject::getPropertyNames(jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> res;
  auto propertyNames = backing->getPropertyNames(rt);
  for (size_t i = 0, size = propertyNames.size(rt); i < size; i++) {
    res.push_back(jsi::PropNameID::forString(rt, propertyNames.getValueAtIndex(rt, i).asString(rt)));
  }
  return res;
}

}
