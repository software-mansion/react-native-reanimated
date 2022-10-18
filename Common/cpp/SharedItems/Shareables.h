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
  jsi::Runtime *rnRuntime; // React-Naitve's main JS runtime
  std::shared_ptr<Scheduler> scheduler;

  JSRuntimeHelper(jsi::Runtime *_rnRuntime, jsi::Runtime *_uiRuntime, const std::shared_ptr<Scheduler> &_scheduler)
      : rnRuntime(_rnRuntime), uiRuntime(_uiRuntime), scheduler(_scheduler) {}

  std::shared_ptr<CoreFunction> valueSetter; 
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
};

// Core functions are not allowed to captrue oputside variables, otherwise the'd
// try to access _closure variable which is something we want to avoid for
// simplicity reasons.
class CoreFunction {
 private:
  std::shared_ptr<jsi::Function> rnFunction;
  std::shared_ptr<jsi::Function> uiFunction;
  std::string functionBody;
  JSRuntimeHelper
      *runtimeHelper; // runtime helper holds core function references, so we
                      // use normal pointer here to avoid ref cycles.
 public:
  CoreFunction(JSRuntimeHelper *_runtimeHelper, const jsi::Value &workletObject);
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
    FunctionType,
    ObjectType,
    ArrayType,
    WorkletType,
    ReactiveType,
  };

  Shareable(ValueType valueType_) : valueType(valueType_) {};
  virtual jsi::Value getJSValue(jsi::Runtime &rt) {
    return toJSValue(rt);
  }

  ValueType valueType;
};

class RetainingShareable : public Shareable {
public:
  jsi::Runtime *hostRuntime;
  std::shared_ptr<jsi::WeakObject> remoteValue;

  RetainingShareable(jsi::Runtime &rt, ValueType valueType) : Shareable(valueType), hostRuntime(&rt) {}

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
      obj.setProperty(rt, data[i].first.c_str(), data[i].second->getJSValue(rt));
    }
    return obj;
  }

 protected:
  std::vector<std::pair<std::string, std::shared_ptr<Shareable>>> data;
};

class ShareableWorklet : public ShareableObject {
 public:
  JSRuntimeHelper *runtimeHelper;
  ShareableWorklet(
      JSRuntimeHelper *_runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Object &worklet)
      : ShareableObject(rt, worklet), runtimeHelper(_runtimeHelper) {
    valueType = WorkletType;
  }
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    jsi::Value obj = ShareableObject::toJSValue(rt);
    return runtimeHelper->valueUnpacker->call(rt, obj);
  }
};

typedef std::function<void()> ShareableReactiveListener;

class ShareableReactive : public RetainingShareable, public std::enable_shared_from_this<ShareableReactive> {
 private:
  std::map<unsigned long, ShareableReactiveListener> listeners;
  std::shared_ptr<Shareable> value;
  JSRuntimeHelper *runtimeHelper;
 public:
  ShareableReactive(JSRuntimeHelper *runtimeHelper, jsi::Runtime &rt, const jsi::Value &initial);
  inline unsigned long addListener(unsigned long listenerId, ShareableReactiveListener listener) {
    listeners.insert({listenerId, listener});
    return listenerId;
  }
  inline void removeListener(unsigned long listenerId) {
    listeners.erase(listenerId);
  }

  inline jsi::Value getReactiveValue(jsi::Runtime &rt) {
    return value->getJSValue(rt);
  }

  void setReactiveValue(jsi::Runtime &rt, const jsi::Value &newValue, JSRuntimeHelper *rtHelper);

  jsi::Value toJSValue(jsi::Runtime &rt) override;
};

class ShareableReactiveHostObject : public jsi::HostObject {
public:
 JSRuntimeHelper *runtimeHelper;
 std::shared_ptr<ShareableReactive> shareable;

 ShareableReactiveHostObject(JSRuntimeHelper *_rtHelper,
                             const std::shared_ptr<ShareableReactive> &_shareable)
     : runtimeHelper(_rtHelper), shareable(_shareable){};
 virtual ~ShareableReactiveHostObject(){};

 jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) override {
   if (name.utf8(rt) == "value") {
     return shareable->getReactiveValue(rt);
   }
   throw "unknown key";
 }

 void set(
     jsi::Runtime &rt,
     const jsi::PropNameID &name,
     const jsi::Value &jsValue) override {
   if (name.utf8(rt) == "value") {
     shareable->setReactiveValue(rt, jsValue, runtimeHelper);
   }
 }

 static jsi::Object newHostObject(
     JSRuntimeHelper *runtimeHelper,
     jsi::Runtime &rt,
     const std::shared_ptr<ShareableReactive> &value) {
   return jsi::Object::createFromHostObject(
       rt, std::make_shared<ShareableReactiveHostObject>(runtimeHelper, value));
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
        throw "invalid scalar type";
    }
  }

 protected:
  union Data {
    bool boolean;
    double number;
  };

  Data data;
};

}
