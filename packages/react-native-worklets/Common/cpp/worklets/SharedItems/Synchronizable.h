#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/SynchronizableAccess.h>

#include <memory>
#include <utility>
#include <vector>

using namespace facebook;

namespace worklets {

template <typename TValue>
class SynchronizableConverter {
 public:
  static jsi::Value jsValue(jsi::Runtime &rt, const TValue &value);
  static TValue hostValue(jsi::Runtime &rt, const jsi::Value &value);
};

// TODO: Use CRTP instead.
template <typename TValue>
class Synchronizable
    : public SynchronizableAccess,
      public SynchronizableConverter<TValue>,
      public facebook::jsi::HostObject,
      public std::enable_shared_from_this<Synchronizable<TValue>> {
 private:
  // TODO: Find a way of taking the unmangled method names in compile
  // time and use them instead of these hardcoded strings.
  static constexpr char getDirtyName_[9]{"getDirty"};
  static constexpr char getBlockingName_[12]{"getBlocking"};
  static constexpr char setDirtyName_[9]{"setDirty"};
  static constexpr char setBlockingName_[12]{"setBlocking"};
  static constexpr char lockName_[5]{"lock"};
  static constexpr char unlockName_[7]{"unlock"};

 public:
  jsi::Value get(jsi::Runtime &rt, const jsi::PropNameID &name) override {
    // TODO: Reduce the amount of boilerplate in this method.
    const auto nameStr = name.utf8(rt);
    if (nameStr == getDirtyName_) {
      return jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, getDirtyName_),
          0,

          [this](
              jsi::Runtime &rt,
              const jsi::Value &thisVal,
              const jsi::Value *args,
              size_t count) { return jsValue(rt, getDirty()); });
    } else if (nameStr == getBlockingName_) {
      return jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, getBlockingName_),
          0,
          [this](
              jsi::Runtime &rt,
              const jsi::Value &thisVal,
              const jsi::Value *args,
              size_t count) { return jsValue(rt, getBlocking()); });
    } else if (nameStr == setDirtyName_) {
      return jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, setDirtyName_),
          1,
          [this](
              jsi::Runtime &rt,
              const jsi::Value &thisVal,
              const jsi::Value *args,
              size_t count) {
            setDirty(hostValue(rt, args[0]));
            return jsi::Value::undefined();
          });
    } else if (nameStr == setBlockingName_) {
      return jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, setBlockingName_),
          1,
          [this](
              jsi::Runtime &rt,
              const jsi::Value &thisVal,
              const jsi::Value *args,
              size_t count) {
            setBlocking(hostValue(rt, args[0]));
            return jsi::Value::undefined();
          });
    } else if (nameStr == lockName_) {
      return jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, lockName_),
          1,
          [this](
              jsi::Runtime &rt,
              const jsi::Value &thisVal,
              const jsi::Value *args,
              size_t count) {
            lock();
            return jsi::Value::undefined();
          });
    } else if (nameStr == unlockName_) {
      return jsi::Function::createFromHostFunction(
          rt,
          jsi::PropNameID::forUtf8(rt, unlockName_),
          1,
          [this](
              jsi::Runtime &rt,
              const jsi::Value &thisVal,
              const jsi::Value *args,
              size_t count) {
            unlock();
            return jsi::Value::undefined();
          });
    } else {
      return jsi::Value::undefined();
    }
  }

  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime &rt) override {
    auto props = std::vector<jsi::PropNameID>{};
    props.push_back(jsi::PropNameID::forUtf8(rt, getDirtyName_));
    props.push_back(jsi::PropNameID::forUtf8(rt, getBlockingName_));
    props.push_back(jsi::PropNameID::forUtf8(rt, setDirtyName_));
    props.push_back(jsi::PropNameID::forUtf8(rt, setBlockingName_));
    props.push_back(jsi::PropNameID::forUtf8(rt, lockName_));
    props.push_back(jsi::PropNameID::forUtf8(rt, unlockName_));
    return props;
  }

  TValue getDirty() {
    // Can run concurrently with getDirty, getBlocking, setDirty, setBlocking.
    return value_;
  }

  TValue getBlocking() {
    // Can run concurrently with getDirty, getBlocking.
    // Cannot run concurrently with setDirty, setBlocking.
    getBlockingBefore();
    auto value = value_;
    getBlockingAfter();
    return value;
  }

  void setDirty(TValue value) {
    // Can run concurrently with getDirty, setDirty.
    // Cannot run concurrently with getBlocking, setBlocking.
    setDirtyBefore();
    value_ = value;
    setDirtyAfter();
  }

  void setBlocking(TValue value) {
    // Can run concurrently with getDirty.
    // Cannot run concurrently with getBlocking, setDirty, setBlocking.
    setBlockingBefore();
    value_ = value;
    setBlockingAfter();
  }

  jsi::Value jsValue(jsi::Runtime &rt, const TValue &value) {
    return static_cast<SynchronizableConverter<TValue> *>(this)->jsValue(
        rt, value);
  }

  TValue hostValue(jsi::Runtime &rt, const jsi::Value &value) {
    return static_cast<SynchronizableConverter<TValue> *>(this)->hostValue(
        rt, value);
  }

  explicit Synchronizable(TValue &&value) : value_{std::move(value)} {};

  virtual ~Synchronizable() = default;

 private:
  // TODO: Consider making TValue a template Mixin with getter and setter.
  // TODO: Perhaps we can use Serializable as TValue.
  TValue value_;
};

// TODO: More base implementations, consult with Serializable
// and CSS objects.

}; // namespace worklets
