#pragma once

#include <jsi/jsi.h>
#include <memory>

#include "RuntimeManager.h"
#include "Scheduler.h"

using namespace facebook;

namespace reanimated {

class CoreFunction;

class JSRuntimeHelper {
 public:
  jsi::Runtime *uiRuntime; // UI runtime created by Reanimated
  jsi::Runtime *rnRuntime; // React-Native's main JS runtime
  std::shared_ptr<Scheduler> scheduler;

  JSRuntimeHelper(
      jsi::Runtime *_rnRuntime,
      jsi::Runtime *_uiRuntime,
      const std::shared_ptr<Scheduler> &_scheduler)
      : rnRuntime(_rnRuntime), uiRuntime(_uiRuntime), scheduler(_scheduler) {}

  std::shared_ptr<CoreFunction> valueUnpacker;

  inline bool isUIRuntime(const jsi::Runtime &rt) const {
    return &rt == uiRuntime;
  }

  inline bool isRNRuntime(const jsi::Runtime &rt) const {
    return &rt == rnRuntime;
  }

  void scheduleOnUI(std::function<void()> job) {
    scheduler->scheduleOnUI(job);
  }

  void scheduleOnJS(std::function<void()> job) {
    scheduler->scheduleOnJS(job);
  }
};

// Core functions are not allowed to capture outside variables, otherwise they'd
// try to access _closure variable which is something we want to avoid for
// simplicity reasons.
class CoreFunction {
 private:
  std::shared_ptr<jsi::Function> rnFunction;
  std::shared_ptr<jsi::Function> uiFunction;
  std::string functionBody;
  std::string location;
  JSRuntimeHelper
      *runtimeHelper; // runtime helper holds core function references, so we
                      // use normal pointer here to avoid ref cycles.
 public:
  CoreFunction(
      JSRuntimeHelper *_runtimeHelper,
      const jsi::Value &workletObject);
  jsi::Value call(jsi::Runtime &rt, const jsi::Value &arg0);
};

class Shareable {
 protected:
  virtual jsi::Value toJSValue(jsi::Runtime &rt) = 0;

 public:
  virtual ~Shareable();

  enum ValueType {
    UndefinedType,
    NullType,
    BooleanType,
    NumberType,
    // SymbolType, TODO
    // BigIntType, TODO
    StringType,
    ObjectType,
    ArrayType,
    WorkletType,
    RemoteFunctionType,
    HandleType,
  };

  Shareable(ValueType valueType_) : valueType(valueType_){};
  virtual jsi::Value getJSValue(jsi::Runtime &rt) {
    return toJSValue(rt);
  }

  ValueType valueType;
};

class RetainingShareable : public Shareable {
 public:
  jsi::Runtime *hostRuntime;
  std::shared_ptr<jsi::WeakObject> remoteValue;

  RetainingShareable(jsi::Runtime &rt, ValueType valueType)
      : Shareable(valueType), hostRuntime(&rt) {}

  jsi::Value getJSValue(jsi::Runtime &rt) override final;
};

class ShareableJSRef : public jsi::HostObject {
 public:
  std::shared_ptr<Shareable> value;
  ShareableJSRef(std::shared_ptr<Shareable> _value) : value(_value){};
  virtual ~ShareableJSRef(){};

  static jsi::Object newHostObject(
      jsi::Runtime &rt,
      const std::shared_ptr<Shareable> &value) {
    return jsi::Object::createFromHostObject(
        rt, std::make_shared<ShareableJSRef>(value));
  }
};

std::shared_ptr<Shareable> extractShareableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &maybeShareableValue);

class ShareableArray : public RetainingShareable {
 public:
  ShareableArray(jsi::Runtime &rt, const jsi::Array &array);

  jsi::Value toJSValue(jsi::Runtime &rt) override {
    auto ary = jsi::Array(rt, data.size());
    for (size_t i = 0; i < data.size(); i++) {
      ary.setValueAtIndex(rt, i, data[i]->getJSValue(rt));
    }
    return ary;
  }

 protected:
  std::vector<std::shared_ptr<Shareable>> data;
};

class ShareableObject : public RetainingShareable {
 public:
  ShareableObject(jsi::Runtime &rt, const jsi::Object &object);
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    auto obj = jsi::Object(rt);
    for (size_t i = 0; i < data.size(); i++) {
      obj.setProperty(
          rt, data[i].first.c_str(), data[i].second->getJSValue(rt));
    }
    return obj;
  }

 protected:
  std::vector<std::pair<std::string, std::shared_ptr<Shareable>>> data;
};

class ShareableWorklet : public ShareableObject {
 private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper;

 public:
  ShareableWorklet(
      const std::shared_ptr<JSRuntimeHelper> runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Object &worklet)
      : ShareableObject(rt, worklet), runtimeHelper(runtimeHelper) {
    valueType = WorkletType;
  }
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    jsi::Value obj = ShareableObject::toJSValue(rt);
    return runtimeHelper->valueUnpacker->call(rt, obj);
  }
};

class ShareableRemoteFunction
    : public RetainingShareable,
      public std::enable_shared_from_this<ShareableRemoteFunction> {
 private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper;

 public:
  jsi::Function function;
  ShareableRemoteFunction(
      const std::shared_ptr<JSRuntimeHelper> runtimeHelper,
      jsi::Runtime &rt,
      jsi::Function &&function)
      : RetainingShareable(rt, RemoteFunctionType),
        runtimeHelper(runtimeHelper),
        function(std::move(function)) {}
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    if (runtimeHelper->isUIRuntime(rt)) {
      return ShareableJSRef::newHostObject(rt, shared_from_this());
    } else {
      return jsi::Value(rt, function);
    }
  }
};

class ShareableHandle : public RetainingShareable {
 private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper;
  std::shared_ptr<ShareableObject> initializer;

 public:
  ShareableHandle(
      const std::shared_ptr<JSRuntimeHelper> runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Object &initializerObject)
      : RetainingShareable(rt, HandleType), runtimeHelper(runtimeHelper) {
    initializer = std::make_shared<ShareableObject>(rt, initializerObject);
  }
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    auto initObj = initializer->getJSValue(rt);
    auto value = runtimeHelper->valueUnpacker->call(rt, initObj);
    initializer = nullptr; // we can release ref to initializer as this method
                           // should be called at most once
    return value;
  }
};

class ShareableString : public Shareable {
 public:
  ShareableString(jsi::Runtime &rt, const jsi::String &string)
      : Shareable(StringType) {
    data = string.utf8(rt);
  }
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    return jsi::String::createFromUtf8(rt, data);
  }

 protected:
  std::string data;
};

class ShareableScalar : public Shareable {
 public:
  ShareableScalar(double number) : Shareable(NumberType) {
    data.number = number;
  };
  ShareableScalar(bool boolean) : Shareable(BooleanType) {
    data.boolean = boolean;
  };
  ShareableScalar() : Shareable(UndefinedType) {}
  ShareableScalar(std::nullptr_t) : Shareable(NullType) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override {
    switch (valueType) {
      case Shareable::UndefinedType:
        return jsi::Value();
      case Shareable::NullType:
        return jsi::Value(nullptr);
      case Shareable::BooleanType:
        return jsi::Value(data.boolean);
      case Shareable::NumberType:
        return jsi::Value(data.number);
      default:
        throw std::runtime_error(
            "attempted to convert object that's not of a scalar type");
    }
  }

 protected:
  union Data {
    bool boolean;
    double number;
  };

  Data data;
};

} // namespace reanimated
