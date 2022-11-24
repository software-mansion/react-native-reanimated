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

  volatile bool uiRuntimeDestroyed;
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
 protected:
  std::shared_ptr<JSRuntimeHelper> runtimeHelper_;

 public:
#if HAS_JS_WEAK_OBJECTS
  // remoteValue is manualy managed in order to avoid potential crashes due to
  // the UI runtime being town down. In development mode, or when the app
  // instance is shut down, the UI runtime will destruct before the RN runtime.
  // The RetainingShareable class makes it so that the objects from RN runtime
  // may retain WeakObject references to objects from the UI runtime. Because of
  // that these objects won't allocate prior to the UI runtime being destroyed
  // and in such scenario we can skip deleting them. This causes the object
  // reference to leak, however it is a better tradeoff than keeping track of
  // all the allocated objects only so that we can clean them up before the
  // runtime goes down -- note again, that this only happens in development mode
  // when the app reloads and when the react instance is terminated in
  // production (e.g. when the app is being gracefully shut down by the system).
  // In addition, we only leak small object references, as the underlying
  // objects are allocated in the JS VM memory space and are deallocated along
  // with the VM.
  jsi::WeakObject *remoteValue;
  jsi::Value getJSValue(jsi::Runtime &rt) override final;

  RetainingShareable(
      const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
      jsi::Runtime &rt,
      ValueType valueType)
      : Shareable(valueType), runtimeHelper_(runtimeHelper) {}

  ~RetainingShareable();
#else
  RetainingShareable(
      const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
      jsi::Runtime &rt,
      ValueType valueType)
      : Shareable(valueType), runtimeHelper_(runtimeHelper) {}
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
  ShareableArray(
      const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Array &array);

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
  ShareableObject(
      const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Object &object);
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
 public:
  ShareableWorklet(
      const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Object &worklet)
      : ShareableObject(runtimeHelper, rt, worklet) {
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
  jsi::Function function_;

 public:
  ShareableRemoteFunction(
      const std::shared_ptr<JSRuntimeHelper> &runtimeHelper,
      jsi::Runtime &rt,
      jsi::Function &&function)
      : RetainingShareable(runtimeHelper, rt, RemoteFunctionType),
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
  std::unique_ptr<ShareableObject> initializer_;
  jsi::Value *remoteValue;

 public:
  ShareableHandle(
      const std::shared_ptr<JSRuntimeHelper> runtimeHelper,
      jsi::Runtime &rt,
      const jsi::Object &initializerObject)
      : Shareable(HandleType), runtimeHelper_(runtimeHelper) {
    initializer_ =
        std::make_unique<ShareableObject>(runtimeHelper, rt, initializerObject);
  }
  ~ShareableHandle() {
    // We can only call to jsi::Value destructor if the runtime is still alive.
    // Due to the fact that some of the ShareableHandle will be referenced from
    // the RN JS runtime that gets destroyed after the UI runtime, we may have
    // this destructor triggered while the UI runtime is already down. Deleting
    // jsi::Value in such case will crash as the underlying data on the JS VM
    // side is alerady gone. Similarily to how we do this in RetainingShareable,
    // we leak the JS VM pointer reference here as it is more efficient than
    // storing the map of all the allocated values only so they can be cleaned
    // up in the right moment given that the cleanup only happens in development
    // mode or when the react instance is being terminated (e.g. when the
    // application process is being torn down gracefully)
    if (!runtimeHelper_->uiRuntimeDestroyed) {
      delete remoteValue;
    }
  }
  jsi::Value toJSValue(jsi::Runtime &rt) override {
    if (initializer_ != nullptr) {
      auto initObj = initializer_->getJSValue(rt);
      remoteValue =
          new jsi::Value(runtimeHelper_->valueUnpacker->call(rt, initObj));
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
