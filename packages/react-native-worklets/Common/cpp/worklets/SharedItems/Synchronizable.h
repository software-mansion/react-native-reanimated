#pragma once

#include <jsi/jsi.h>
#include <worklets/SharedItems/SynchronizableAccess.h>

#include <memory>
#include <utility>
#include <vector>

namespace worklets {

template <typename TValue>
class SynchronizableConverter {
 public:
  using JSValue = facebook::jsi::Value;
  using Runtime = facebook::jsi::Runtime;

  static auto jsValue(Runtime &rt, const TValue &value) -> JSValue;
  static auto hostValue(Runtime &rt, const JSValue &value) -> TValue;
};

// TODO: Use CRTP instead.
template <typename TValue>
class Synchronizable
    : public SynchronizableAccess,
      public SynchronizableConverter<TValue>,
      public facebook::jsi::HostObject,
      public std::enable_shared_from_this<Synchronizable<TValue>> {
 private:
  using JSValue = facebook::jsi::Value;
  using Runtime = facebook::jsi::Runtime;

  // TODO: Find a way of taking the unmangled method names in compile
  // time and use them instead of these hardcoded strings.
  static constexpr char getDirtyName_[9]{"getDirty"};
  static constexpr char getBlockingName_[12]{"getBlocking"};
  static constexpr char setDirtyName_[9]{"setDirty"};
  static constexpr char setBlockingName_[12]{"setBlocking"};
  static constexpr char lockName_[5]{"lock"};
  static constexpr char unlockName_[7]{"unlock"};

 public:
  auto get(Runtime &rt, const facebook::jsi::PropNameID &name)
      -> JSValue override {
    // TODO: Reduce the amount of boilerplate in this method.
    const auto nameStr = name.utf8(rt);
    if (nameStr == getDirtyName_) {
      return facebook::jsi::Function::createFromHostFunction(
          rt,
          facebook::jsi::PropNameID::forUtf8(rt, "getDirty"),
          0,

          [this](
              facebook::jsi::Runtime &rt,
              const facebook::jsi::Value &thisVal,
              const facebook::jsi::Value *args,
              size_t count) { return jsValue(rt, getDirty()); });
    } else if (nameStr == getBlockingName_) {
      return facebook::jsi::Function::createFromHostFunction(
          rt,
          facebook::jsi::PropNameID::forUtf8(rt, "getBlocking"),
          0,
          [this](
              facebook::jsi::Runtime &rt,
              const facebook::jsi::Value &thisVal,
              const facebook::jsi::Value *args,
              size_t count) { return jsValue(rt, getBlocking()); });
    } else if (nameStr == setDirtyName_) {
      return facebook::jsi::Function::createFromHostFunction(
          rt,
          facebook::jsi::PropNameID::forUtf8(rt, "setDirty"),
          1,
          [this](
              facebook::jsi::Runtime &rt,
              const facebook::jsi::Value &thisVal,
              const facebook::jsi::Value *args,
              size_t count) {
            setDirty(hostValue(rt, args[0]));
            return facebook::jsi::Value::undefined();
          });
    } else if (nameStr == setBlockingName_) {
      return facebook::jsi::Function::createFromHostFunction(
          rt,
          facebook::jsi::PropNameID::forUtf8(rt, "setBlocking"),
          1,
          [this](
              facebook::jsi::Runtime &rt,
              const facebook::jsi::Value &thisVal,
              const facebook::jsi::Value *args,
              size_t count) {
            setBlocking(hostValue(rt, args[0]));
            return facebook::jsi::Value::undefined();
          });
    } else if (nameStr == lockName_) {
      return facebook::jsi::Function::createFromHostFunction(
          rt,
          facebook::jsi::PropNameID::forUtf8(rt, "lock"),
          1,
          [this](
              facebook::jsi::Runtime &rt,
              const facebook::jsi::Value &thisVal,
              const facebook::jsi::Value *args,
              size_t count) {
            lock();
            return facebook::jsi::Value::undefined();
          });
    } else if (nameStr == unlockName_) {
      return facebook::jsi::Function::createFromHostFunction(
          rt,
          facebook::jsi::PropNameID::forUtf8(rt, "lock"),
          1,
          [this](
              facebook::jsi::Runtime &rt,
              const facebook::jsi::Value &thisVal,
              const facebook::jsi::Value *args,
              size_t count) {
            unlock();
            return facebook::jsi::Value::undefined();
          });
    } else {
      return facebook::jsi::Value::undefined();
    }
  }

  auto getPropertyNames(Runtime &rt)
      -> std::vector<facebook::jsi::PropNameID> override {
    auto props = std::vector<facebook::jsi::PropNameID>{};
    props.push_back(facebook::jsi::PropNameID::forUtf8(rt, getDirtyName_));
    props.push_back(facebook::jsi::PropNameID::forUtf8(rt, getBlockingName_));
    props.push_back(facebook::jsi::PropNameID::forUtf8(rt, setDirtyName_));
    props.push_back(facebook::jsi::PropNameID::forUtf8(rt, setBlockingName_));
    return props;
  }

  auto getDirty() -> TValue {
    // Can run concurrently with getDirty, getBlocking, setDirty, setBlocking.
    return value_;
  }

  auto getBlocking() -> TValue {
    // Can run concurrently with getDirty, getBlocking.
    // Cannot run concurrently with setDirty, setBlocking.
    getBlockingBefore();
    auto value = value_;
    getBlockingAfter();
    return value;
  }

  auto setDirty(TValue value) -> void {
    // Can run concurrently with getDirty, setDirty.
    // Cannot run concurrently with getBlocking, setBlocking.
    setDirtyBefore();
    value_ = value;
    setDirtyAfter();
  }

  auto setBlocking(TValue value) -> void {
    // Can run concurrently with getDirty.
    // Cannot run concurrently with getBlocking, setDirty, setBlocking.
    setBlockingBefore();
    value_ = value;
    setBlockingAfter();
  }

  auto jsValue(Runtime &rt, const TValue &value) -> JSValue {
    return static_cast<SynchronizableConverter<TValue> *>(this)->jsValue(
        rt, value);
  }

  auto hostValue(Runtime &rt, const JSValue &value) -> TValue {
    return static_cast<SynchronizableConverter<TValue> *>(this)->hostValue(
        rt, value);
  }

  explicit Synchronizable(TValue &&value) : value_{std::move(value)} {};

  virtual ~Synchronizable() = default;

 private:
  // TODO: Consider making TValue a template Mixin with getter and setter.
  // TODO: Perhaps we can use Serializable (old Shareable) as TValue.
  TValue value_;
};

// TODO: More base implementations, consult with Serializable (old Shareable)
// and CSS objects.

template <>
auto SynchronizableConverter<double>::jsValue(Runtime &rt, const double &value)
    -> JSValue;

template <>
auto SynchronizableConverter<double>::hostValue(
    Runtime &rt,
    const JSValue &value) -> double;

}; // namespace worklets
