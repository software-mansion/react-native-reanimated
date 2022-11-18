#pragma once

#include <jsi/jsi.h>
#include <memory>

#include "ReanimatedRuntime.h"
#include "RuntimeManager.h"
#include "Scheduler.h"

#define HAS_JS_WEAK_OBJECTS JS_RUNTIME_HERMES

using namespace facebook;

namespace reanimated {

class CoreFunction;

class JSRuntimeHelper {
 private:
  jsi::Runtime *rnRuntime_; // React-Native's main JS runtime
  jsi::Runtime *uiRuntime_; // UI runtime created by Reanimated
  std::shared_ptr<Scheduler> scheduler_;

 public:
  JSRuntimeHelper(
      jsi::Runtime *rnRuntime,
      jsi::Runtime *uiRuntime,
      const std::shared_ptr<Scheduler> &scheduler)
      : rnRuntime_(rnRuntime), uiRuntime_(uiRuntime), scheduler_(scheduler) {}

  std::shared_ptr<CoreFunction> valueUnpacker;

  inline jsi::Runtime *uiRuntime() const {
    return uiRuntime_;
  }

  inline jsi::Runtime *rnRuntime() const {
    return rnRuntime_;
  }

  inline bool isUIRuntime(const jsi::Runtime &rt) const {
    return &rt == uiRuntime_;
  }

  inline bool isRNRuntime(const jsi::Runtime &rt) const {
    return &rt == rnRuntime_;
  }

  void scheduleOnUI(std::function<void()> job) {
    scheduler_->scheduleOnUI(job);
  }

  void scheduleOnJS(std::function<void()> job) {
    scheduler_->scheduleOnJS(job);
  }
};

// Core functions are not allowed to capture outside variables, otherwise they'd
// try to access _closure variable which is something we want to avoid for
// simplicity reasons.
class CoreFunction {
 private:
  std::shared_ptr<jsi::Function> rnFunction_;
  std::shared_ptr<jsi::Function> uiFunction_;
  std::string functionBody_;
  std::string location_;
  JSRuntimeHelper
      *runtimeHelper_; // runtime helper holds core function references, so we
                       // use normal pointer here to avoid ref cycles.
  std::shared_ptr<jsi::Function> getFunction(jsi::Runtime &rt);

 public:
  CoreFunction(JSRuntimeHelper *runtimeHelper, const jsi::Value &workletObject);
  template <typename... Args>
  jsi::Value call(jsi::Runtime &rt, Args &&...args) {
    return getFunction(rt)->call(rt, args...);
  }
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
    SynchronizedDataHolder,
  };

  Shareable(ValueType valueType) : valueType_(valueType){};
  virtual jsi::Value getJSValue(jsi::Runtime &rt) {
    return toJSValue(rt);
  }

  inline ValueType valueType() const {
    return valueType_;
  }

  static std::shared_ptr<Shareable> undefined();

 protected:
  ValueType valueType_;
};

class RetainingShareable : public Shareable {
 public:
#if HAS_JS_WEAK_OBJECTS
  jsi::Runtime *hostRuntime;
  std::shared_ptr<jsi::WeakObject> remoteValue;

  jsi::Value getJSValue(jsi::Runtime &rt) override final;

  RetainingShareable(jsi::Runtime &rt, ValueType valueType)
      : Shareable(valueType), hostRuntime(&rt) {}
#else
  RetainingShareable(jsi::Runtime &rt, ValueType valueType)
      : Shareable(valueType) {}
#endif
};

class ShareableJSRef : public jsi::HostObject {
 private:
  std::shared_ptr<Shareable> value_;

 public:
  ShareableJSRef(std::shared_ptr<Shareable> value) : value_(value){};
  std::shared_ptr<Shareable> value() const {
    return value_;
  }

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

template <typename T>
std::shared_ptr<T> extractShareableOrThrow(
    jsi::Runtime &rt,
    const jsi::Value &shareableRef) {
  auto res =
      std::dynamic_pointer_cast<T>(extractShareableOrThrow(rt, shareableRef));
  if (!res) {
    throw new std::runtime_error(
        "provided shareable object is of an incompatible type");
  }
  return res;
}

class ShareableArray : public RetainingShareable {
 public:
  ShareableArray(jsi::Runtime &rt, const jsi::Array &array);

  jsi::Value toJSValue(jsi::Runtime &rt) override {
    auto size = data_.size();
    auto ary = jsi::Array(rt, size);
    for (size_t i = 0; i < size; i++) {
      ary.setValueAtIndex(rt, i, data_[i]->getJSValue(rt));
    }
    return ary;
  }

 protected:
  std::vector<std::shared_ptr<Shareable>> data_;
};

class ShareableObject : public RetainingShareable {
 public:
  ShareableObject(jsi::Runtime &rt, const jsi::Object &object);
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    auto obj = jsi::Object(rt);
    for (size_t i = 0, size = data_.size(); i < size; i++) {
      obj.setProperty(
          rt, data_[i].first.c_str(), data_[i].second->getJSValue(rt));
    }
    return obj;
  }

 protected:
  std::vector<std::pair<std::string, std::shared_ptr<Shareable>>> data_;
};

class ShareableWorklet : public ShareableObject {
 private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;

 public:
  ShareableWorklet(
      const std::shared_ptr<JSRuntimeHelper> runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Object &worklet)
      : ShareableObject(rt, worklet), runtimeHelper_(runtimeHelper) {
    valueType_ = WorkletType;
  }
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    jsi::Value obj = ShareableObject::toJSValue(rt);
    return runtimeHelper_->valueUnpacker->call(rt, obj);
  }
};

class ShareableRemoteFunction
    : public RetainingShareable,
      public std::enable_shared_from_this<ShareableRemoteFunction> {
 private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  jsi::Function function_;

 public:
  ShareableRemoteFunction(
      const std::shared_ptr<JSRuntimeHelper> runtimeHelper,
      jsi::Runtime &rt,
      jsi::Function &&function)
      : RetainingShareable(rt, RemoteFunctionType),
        runtimeHelper_(runtimeHelper),
        function_(std::move(function)) {}
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    if (runtimeHelper_->isUIRuntime(rt)) {
      return ShareableJSRef::newHostObject(rt, shared_from_this());
    } else {
      return jsi::Value(rt, function_);
    }
  }
};

class ShareableHandle : public Shareable {
 private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  std::shared_ptr<ShareableObject> initializer_;
  std::shared_ptr<jsi::Value> remoteValue;

 public:
  ShareableHandle(
      const std::shared_ptr<JSRuntimeHelper> runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Object &initializerObject)
      : Shareable(HandleType), runtimeHelper_(runtimeHelper) {
    initializer_ = std::make_shared<ShareableObject>(rt, initializerObject);
  }
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    if (initializer_ != nullptr) {
      auto initObj = initializer_->getJSValue(rt);
      remoteValue = std::make_shared<jsi::Value>(
          runtimeHelper_->valueUnpacker->call(rt, initObj));
      initializer_ = nullptr; // we can release ref to initializer as this
                              // method should be called at most once
    }
    return jsi::Value(rt, *remoteValue);
  }
};

class ShareableSynchronizedDataHolder
    : public Shareable,
      public std::enable_shared_from_this<ShareableSynchronizedDataHolder> {
 private:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;
  std::shared_ptr<Shareable> data_;
  std::shared_ptr<jsi::Value> uiValue_;
  std::shared_ptr<jsi::Value> rnValue_;
  std::mutex dataAccessLock_;

 public:
  ShareableSynchronizedDataHolder(
      std::shared_ptr<JSRuntimeHelper> runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Value &initialValue)
      : Shareable(SynchronizedDataHolder),
        runtimeHelper_(runtimeHelper),
        data_(extractShareableOrThrow(rt, initialValue)) {}

  jsi::Value get(jsi::Runtime &rt) {
    std::unique_lock<std::mutex> read_lock(dataAccessLock_);
    if (runtimeHelper_->isUIRuntime(rt)) {
      if (uiValue_ == nullptr) {
        auto value = data_->getJSValue(rt);
        uiValue_ = std::make_shared<jsi::Value>(rt, value);
        return value;
      } else {
        return jsi::Value(rt, *uiValue_);
      }
    } else {
      if (rnValue_ == nullptr) {
        auto value = data_->getJSValue(rt);
        rnValue_ = std::make_shared<jsi::Value>(rt, value);
        return value;
      } else {
        return jsi::Value(rt, *rnValue_);
      }
    }
  }

  void set(jsi::Runtime &rt, const jsi::Value &data) {
    std::unique_lock<std::mutex> write_lock(dataAccessLock_);
    data_ = extractShareableOrThrow(rt, data);
    uiValue_.reset();
    rnValue_.reset();
  }

  jsi::Value toJSValue(jsi::Runtime &rt) override {
    return ShareableJSRef::newHostObject(rt, shared_from_this());
  };
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
    data_.number = number;
  };
  ShareableScalar(bool boolean) : Shareable(BooleanType) {
    data_.boolean = boolean;
  };
  ShareableScalar() : Shareable(UndefinedType) {}
  ShareableScalar(std::nullptr_t) : Shareable(NullType) {}

  jsi::Value toJSValue(jsi::Runtime &rt) override {
    switch (valueType_) {
      case Shareable::UndefinedType:
        return jsi::Value();
      case Shareable::NullType:
        return jsi::Value(nullptr);
      case Shareable::BooleanType:
        return jsi::Value(data_.boolean);
      case Shareable::NumberType:
        return jsi::Value(data_.number);
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

 private:
  Data data_;
};

} // namespace reanimated
