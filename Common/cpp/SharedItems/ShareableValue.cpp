#include <cxxabi.h>
#include <utility>

#ifdef RCT_NEW_ARCH_ENABLED
#include <react/renderer/uimanager/primitives.h>
#endif

#include "FrozenObject.h"
#include "MutableValue.h"
#include "MutableValueSetterProxy.h"
#include "RemoteObject.h"
#include "RuntimeDecorator.h"
#include "RuntimeManager.h"
#include "ShareableValue.h"
#include "SharedParent.h"

namespace reanimated {

const char *CALL_ASYNC = "__callAsync";
const char *PRIMAL_FUNCTION = "__primalFunction";
const char *CALLBACK_ERROR_SUFFIX =
    "\n\nPossible solutions are:\n"
    "a) If you want to synchronously execute this method, mark it as a Worklet\n"
    "b) If you want to execute this method on the JS thread, wrap it using runOnJS";

class ShareableValueRef : public jsi::HostObject {
public:
  std::shared_ptr<ShareableValue> value;
  ShareableValueRef(std::shared_ptr<ShareableValue> _value) : value(_value) {};
  ~ShareableValueRef() {};
};

void addHiddenProperty(
    jsi::Runtime &rt,
    jsi::Value &&value,
    const jsi::Object &obj,
    const char *name) {
  jsi::Object globalObject = rt.global().getPropertyAsObject(rt, "Object");
  jsi::Function defineProperty =
      globalObject.getPropertyAsFunction(rt, "defineProperty");
  jsi::String internalPropName = jsi::String::createFromUtf8(rt, name);
  jsi::Object paramForDefineProperty(rt);
  paramForDefineProperty.setProperty(rt, "enumerable", false);
  paramForDefineProperty.setProperty(rt, "value", value);
  defineProperty.call(rt, obj, internalPropName, paramForDefineProperty);
}

void freeze(jsi::Runtime &rt, const jsi::Object &obj) {
  jsi::Object globalObject = rt.global().getPropertyAsObject(rt, "Object");
  jsi::Function freeze = globalObject.getPropertyAsFunction(rt, "freeze");
  freeze.call(rt, obj);
}

void ShareableValue::adapt(
    jsi::Runtime &rt,
    const jsi::Value &value,
    ValueType objectType) {

  if (objectType == ValueType::MutableValueType) {
    type = ValueType::MutableValueType;
    valueContainer =
        std::make_unique<MutableValueWrapper>(std::make_shared<MutableValue>(
            rt, value, runtimeManager, runtimeManager->scheduler));
  } else if (value.isUndefined()) {
    type = ValueType::UndefinedType;
  } else if (value.isNull()) {
    type = ValueType::NullType;
  } else if (value.isBool()) {
    type = ValueType::BoolType;
    valueContainer = std::make_unique<BooleanValueWrapper>(value.getBool());
  } else if (value.isNumber()) {
    type = ValueType::NumberType;
    valueContainer = std::make_unique<NumberValueWrapper>(value.asNumber());
  } else if (value.isString()) {
    type = ValueType::StringType;
    valueContainer =
        std::make_unique<StringValueWrapper>(value.asString(rt).utf8(rt));
  } else if (value.isObject()) {
    auto object = value.asObject(rt);
    if (object.isFunction(rt)) {
      if (object.getProperty(rt, "__workletHash").isUndefined()) {
        // not a worklet, we treat this as a host function
        type = ValueType::HostFunctionType;

        // Check if it's a hostFunction wrapper
        jsi::Value primalFunction = object.getProperty(rt, PRIMAL_FUNCTION);
        if (!primalFunction.isUndefined()) {
          jsi::Object handlerAsObject = primalFunction.asObject(rt);
          std::shared_ptr<HostFunctionHandler> handler =
              handlerAsObject.getHostObject<HostFunctionHandler>(rt);
          valueContainer = std::make_unique<HostFunctionWrapper>(handler);
        } else {
          valueContainer = std::make_unique<HostFunctionWrapper>(
              std::make_shared<HostFunctionHandler>(
                  std::make_shared<jsi::Function>(object.asFunction(rt)), rt));
        }

      } else {
        // a worklet
        type = ValueType::WorkletFunctionType;
        valueContainer = std::make_unique<FrozenObjectWrapper>(
            std::make_shared<FrozenObject>(rt, object, runtimeManager));
      }
    } else if (object.isArray(rt)) {
      type = ValueType::FrozenArrayType;
      auto array = object.asArray(rt);
      valueContainer = std::make_unique<FrozenArrayWrapper>();
      auto &frozenArray = ValueWrapper::asFrozenArray(valueContainer);
      for (size_t i = 0, size = array.size(rt); i < size; i++) {
        auto sv = adapt(rt, array.getValueAtIndex(rt, i), runtimeManager);
        frozenArray.push_back(sv);
      }
    } else if (object.isHostObject<MutableValue>(rt)) {
      type = ValueType::MutableValueType;
      valueContainer = std::make_unique<MutableValueWrapper>(
          object.getHostObject<MutableValue>(rt));
    } else if (object.isHostObject<RemoteObject>(rt)) {
      type = ValueType::RemoteObjectType;
      valueContainer = std::make_unique<RemoteObjectWrapper>(
          object.getHostObject<RemoteObject>(rt));
    } else if (objectType == ValueType::RemoteObjectType) {
      type = ValueType::RemoteObjectType;
      valueContainer =
          std::make_unique<RemoteObjectWrapper>(std::make_shared<RemoteObject>(
              rt, object, runtimeManager, runtimeManager->scheduler));
#ifdef RCT_NEW_ARCH_ENABLED
    } else if (object.isHostObject<ShadowNodeWrapper>(rt)) {
      type = ValueType::ShadowNodeType;
      auto shadowNode = object.getHostObject<ShadowNodeWrapper>(rt)->shadowNode;
      valueContainer = std::make_unique<ShadowNodeValueWrapper>(shadowNode);
      adaptCache(rt, value);
#endif
    } else {
      // create frozen object based on a copy of a given object
      type = ValueType::FrozenObjectType;
      valueContainer = std::make_unique<FrozenObjectWrapper>(
          std::make_shared<FrozenObject>(rt, object, runtimeManager));
      auto &frozenObject = ValueWrapper::asFrozenObject(valueContainer);
      if (RuntimeDecorator::isReactRuntime(rt)) {
        freeze(rt, object);
      }
    }
  } else if (value.isSymbol()) {
    type = ValueType::StringType;
    valueContainer =
        std::make_unique<StringValueWrapper>(value.asSymbol(rt).toString(rt));
  } else {
    throw "Invalid value type";
  }
}

static int counter;

ShareableValue::ShareableValue(RuntimeManager *runtimeManager, std::shared_ptr<Scheduler> s) : StoreUser(s, *runtimeManager), runtimeManager(runtimeManager) {
  counter++;
  Logger::log("Create shareable value");
}

ShareableValue::~ShareableValue() {
  counter--;
  Logger::log("DESTROY SHAREABLE VALUE");
  Logger::log(counter);
}

std::shared_ptr<ShareableValue> ShareableValue::adapt(
    jsi::Runtime &rt,
    const jsi::Value &value,
    RuntimeManager *runtimeManager,
    ValueType valueType) {
  auto sv = std::make_shared<ShareableValue>(runtimeManager, runtimeManager->scheduler);
  sv->adapt(rt, value, valueType);
  return sv;
}

jsi::Value ShareableValue::getValue(jsi::Runtime &rt) {
  return toJSValue(rt);
}

jsi::Object ShareableValue::createHost(
    jsi::Runtime &rt,
    std::shared_ptr<jsi::HostObject> host) {
  return jsi::Object::createFromHostObject(rt, host);
}

jsi::Value createFrozenWrapper(
    jsi::Runtime &rt,
    std::shared_ptr<FrozenObject> frozenObject) {
  jsi::Object __reanimatedHiddenHost =
      jsi::Object::createFromHostObject(rt, frozenObject);
  jsi::Object obj = frozenObject->shallowClone(rt);
  jsi::Object globalObject = rt.global().getPropertyAsObject(rt, "Object");
  jsi::Function freeze = globalObject.getPropertyAsFunction(rt, "freeze");
  return freeze.call(rt, obj);
}

jsi::Value ShareableValue::toJSValue(jsi::Runtime &rt) {
  switch (type) {
    case ValueType::UndefinedType:
      return jsi::Value::undefined();
    case ValueType::NullType:
      return jsi::Value::null();
    case ValueType::BoolType:
      return jsi::Value(ValueWrapper::asBoolean(valueContainer));
    case ValueType::NumberType:
      return jsi::Value(ValueWrapper::asNumber(valueContainer));
    case ValueType::StringType: {
      auto &stringValue = ValueWrapper::asString(valueContainer);
      return jsi::Value(rt, jsi::String::createFromUtf8(rt, stringValue));
    }
    case ValueType::FrozenObjectType: {
      auto &frozenObject = ValueWrapper::asFrozenObject(valueContainer);
      return createFrozenWrapper(rt, frozenObject);
    }
    case ValueType::FrozenArrayType: {
      auto &frozenArray = ValueWrapper::asFrozenArray(valueContainer);
      jsi::Array array(rt, frozenArray.size());
      for (size_t i = 0; i < frozenArray.size(); i++) {
        array.setValueAtIndex(rt, i, frozenArray[i]->toJSValue(rt));
      }
      return array;
    }
    case ValueType::RemoteObjectType: {
      auto &remoteObject = ValueWrapper::asRemoteObject(valueContainer);
      if (RuntimeDecorator::isWorkletRuntime(rt)) {
        remoteObject->maybeInitializeOnWorkletRuntime(rt);
      }
      return createHost(rt, remoteObject);
    }
    case ValueType::MutableValueType: {
      auto &mutableObject = ValueWrapper::asMutableValue(valueContainer);
      return createHost(rt, mutableObject);
    }
#ifdef RCT_NEW_ARCH_ENABLED
    case ValueType::ShadowNodeType: {
      auto &shadowNode = ValueWrapper::asShadowNode(valueContainer);
      return createHost(rt, std::make_shared<ShadowNodeWrapper>(shadowNode));
    }
#endif
    case ValueType::HostFunctionType: {
      auto hostFunctionWrapper =
          ValueWrapper::asHostFunctionWrapper(valueContainer);
      auto &hostRuntime = hostFunctionWrapper->value->hostRuntime;
      if (hostRuntime == &rt) {
        // function is accessed from the same runtime it was crated, we just
        // return same function obj
        return jsi::Value(
            rt, *hostFunctionWrapper->value->getPureFunction().get());
      } else {
        // function is accessed from a different runtime, we wrap function in
        // host func that'd enqueue call on an appropriate thread

        auto runtimeManager = this->runtimeManager;
        auto hostFunction = hostFunctionWrapper->value;

        auto warnFunction = [runtimeManager, hostFunction](
                                jsi::Runtime &rt,
                                const jsi::Value &thisValue,
                                const jsi::Value *args,
                                size_t count) -> jsi::Value {
          jsi::Value jsThis = rt.global().getProperty(rt, "jsThis");
          std::string workletLocation = jsThis.asObject(rt)
                                            .getProperty(rt, "__location")
                                            .toString(rt)
                                            .utf8(rt);
          std::string exceptionMessage = "Tried to synchronously call ";
          if (hostFunction->functionName.empty()) {
            exceptionMessage += "anonymous function";
          } else {
            exceptionMessage += "function {" + hostFunction->functionName + "}";
          }
          exceptionMessage +=
              " from a different thread.\n\nOccurred in worklet location: ";
          exceptionMessage += workletLocation;
          exceptionMessage += CALLBACK_ERROR_SUFFIX;
          runtimeManager->errorHandler->setError(exceptionMessage);
          runtimeManager->errorHandler->raise();

          return jsi::Value::undefined();
        };

        auto clb = [runtimeManager, hostFunction, hostRuntime](
                       jsi::Runtime &rt,
                       const jsi::Value &thisValue,
                       const jsi::Value *args,
                       size_t count) -> jsi::Value {
          // TODO: we should find thread based on runtime such that we could
          // also call UI methods from RN and not only RN methods from UI

          std::vector<std::shared_ptr<ShareableValue>> params;
          for (int i = 0; i < count; ++i) {
            params.push_back(
                ShareableValue::adapt(rt, args[i], runtimeManager));
          }

          std::function<void()> job = [hostFunction, hostRuntime, params] {
            jsi::Value *args = new jsi::Value[params.size()];
            for (int i = 0; i < params.size(); ++i) {
              args[i] = params[i]->getValue(*hostRuntime);
            }
            jsi::Value returnedValue =
                hostFunction->getPureFunction().get()->call(
                    *hostRuntime,
                    static_cast<const jsi::Value *>(args),
                    static_cast<size_t>(params.size()));

            delete[] args;
            // ToDo use returned value to return promise
          };

          runtimeManager->scheduler->scheduleOnJS(job);
          return jsi::Value::undefined();
        };
        jsi::Function wrapperFunction = jsi::Function::createFromHostFunction(
            rt, jsi::PropNameID::forAscii(rt, "hostFunction"), 0, warnFunction);
        jsi::Function res = jsi::Function::createFromHostFunction(
            rt, jsi::PropNameID::forAscii(rt, "hostFunction"), 0, clb);
        addHiddenProperty(rt, std::move(res), wrapperFunction, CALL_ASYNC);
        jsi::Object functionHandler =
            createHost(rt, hostFunctionWrapper->value);
        addHiddenProperty(
            rt, std::move(functionHandler), wrapperFunction, PRIMAL_FUNCTION);
        return wrapperFunction;
      }
    }
    case ValueType::WorkletFunctionType: {
      auto runtimeManager = this->runtimeManager;
      auto &frozenObject = ValueWrapper::asFrozenObject(this->valueContainer);
      if (RuntimeDecorator::isWorkletRuntime(rt)) {
        // when running on worklet thread we prep a function

        auto jsThis = std::make_shared<jsi::Object>(
            frozenObject->shallowClone(*runtimeManager->runtime));
        std::shared_ptr<jsi::Function> funPtr(
            runtimeManager->workletsCache->getFunction(rt, frozenObject));
        auto name = funPtr->getProperty(rt, "name").asString(rt).utf8(rt);

        auto clb = [=](jsi::Runtime &rt,
                       const jsi::Value &thisValue,
                       const jsi::Value *args,
                       size_t count) mutable -> jsi::Value {
          const jsi::String jsThisName =
              jsi::String::createFromAscii(rt, "jsThis");
          jsi::Object global = rt.global();
          jsi::Value oldJSThis = global.getProperty(rt, jsThisName);
          global.setProperty(rt, jsThisName, *jsThis); // set jsThis

          jsi::Value res = jsi::Value::undefined();
          try {
            if (thisValue.isObject()) {
              res =
                  funPtr->callWithThis(rt, thisValue.asObject(rt), args, count);
            } else {
              res = funPtr->call(rt, args, count);
            }
          } catch (jsi::JSError &e) {
            throw e;
          } catch (std::exception &e) {
            std::string str = e.what();
            runtimeManager->errorHandler->setError(str);
            runtimeManager->errorHandler->raise();
          } catch (...) {
            if (demangleExceptionName(
                    abi::__cxa_current_exception_type()->name()) ==
                "facebook::jsi::JSError") {
              throw jsi::JSError(rt, "Javascript worklet error");
            }
            // TODO find out a way to get the error's message on hermes
            jsi::Value location = jsThis->getProperty(rt, "__location");
            std::string str = "Javascript worklet error";
            if (location.isString()) {
              str += "\nIn file: " + location.asString(rt).utf8(rt);
            }
            runtimeManager->errorHandler->setError(str);
            runtimeManager->errorHandler->raise();
          }
          global.setProperty(rt, jsThisName, oldJSThis); // clean jsThis
          return res;
        };
        return jsi::Function::createFromHostFunction(
            rt, jsi::PropNameID::forAscii(rt, name.c_str()), 0, clb);
      } else {
        // when run outside of UI thread we enqueue a call on the UI thread
        auto clb = [=](jsi::Runtime &rt,
                       const jsi::Value &thisValue,
                       const jsi::Value *args,
                       size_t count) -> jsi::Value {
          // TODO: we should find thread based on runtime such that we could
          // also call UI methods from RN and not only RN methods from UI

          std::vector<std::shared_ptr<ShareableValue>> params;
          for (int i = 0; i < count; ++i) {
            params.push_back(
                ShareableValue::adapt(rt, args[i], runtimeManager));
          }

          runtimeManager->scheduler->scheduleOnUI([=] {
            jsi::Runtime &rt = *runtimeManager->runtime.get();
            auto jsThis = createFrozenWrapper(rt, frozenObject).getObject(rt);
            auto code =
                jsThis.getProperty(rt, "asString").asString(rt).utf8(rt);
            std::shared_ptr<jsi::Function> funPtr(
                runtimeManager->workletsCache->getFunction(rt, frozenObject));

            jsi::Value *args = new jsi::Value[params.size()];
            for (int i = 0; i < params.size(); ++i) {
              args[i] = params[i]->getValue(rt);
            }

            jsi::Value returnedValue;
            const jsi::String jsThisName =
                jsi::String::createFromAscii(rt, "jsThis");
            jsi::Object global = rt.global();
            jsi::Value oldJSThis = global.getProperty(rt, jsThisName);
            global.setProperty(rt, jsThisName, jsThis); // set jsThis
            try {
              returnedValue = funPtr->call(
                  rt,
                  static_cast<const jsi::Value *>(args),
                  static_cast<size_t>(params.size()));
            } catch (std::exception &e) {
              std::string str = e.what();
              runtimeManager->errorHandler->setError(str);
              runtimeManager->errorHandler->raise();
            } catch (...) {
              if (demangleExceptionName(
                      abi::__cxa_current_exception_type()->name()) ==
                  "facebook::jsi::JSError") {
                throw jsi::JSError(rt, "Javascript worklet error");
              }
              // TODO find out a way to get the error's message on hermes
              jsi::Value location = jsThis.getProperty(rt, "__location");
              std::string str = "Javascript worklet error";
              if (location.isString()) {
                str += "\nIn file: " + location.asString(rt).utf8(rt);
              }
              runtimeManager->errorHandler->setError(str);
              runtimeManager->errorHandler->raise();
            }
            global.setProperty(rt, jsThisName, oldJSThis); // clean jsThis

            delete[] args;
            // ToDo use returned value to return promise
          });
          return jsi::Value::undefined();
        };
        return jsi::Function::createFromHostFunction(
            rt, jsi::PropNameID::forAscii(rt, "_workletFunction"), 0, clb);
      }
    }
    default: {
      throw "Unable to find conversion method for this type";
    }
  }
  throw "convert error";
}

std::string ShareableValue::demangleExceptionName(std::string toDemangle) {
  int status = 0;
  char *buff =
      __cxxabiv1::__cxa_demangle(toDemangle.c_str(), nullptr, nullptr, &status);
  if (!buff) {
    return toDemangle;
  }
  std::string demangled = buff;
  std::free(buff);
  return demangled;
}

} // namespace reanimated
