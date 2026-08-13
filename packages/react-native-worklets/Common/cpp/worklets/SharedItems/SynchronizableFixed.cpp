#include <react/debug/react_native_assert.h>
#include <worklets/SharedItems/SynchronizableFixed.h>

#include <memory>
#include <type_traits>
#include <variant>

namespace worklets {

SynchronizableFixed::SynchronizableFixed(double value)
    : Synchronizable(true), value_(std::in_place_type<std::atomic<double>>, value) {}

SynchronizableFixed::SynchronizableFixed(bool value)
    : Synchronizable(true), value_(std::in_place_type<std::atomic<bool>>, value) {}

std::shared_ptr<SynchronizableFixed> SynchronizableFixed::make(const jsi::Value &initialValue) {
  if (initialValue.isBool()) {
    return std::make_shared<SynchronizableFixed>(initialValue.getBool());
  } else if (initialValue.isNumber()) {
    return std::make_shared<SynchronizableFixed>(initialValue.getNumber());
  } else [[unlikely]] {
    throw std::runtime_error("[Worklets] Expected a number or boolean for a fixed-type Synchronizable.");
  }
}

jsi::Value SynchronizableFixed::getDirty(jsi::Runtime &) {
  return load();
}

jsi::Value SynchronizableFixed::getBlocking(jsi::Runtime &) {
  getBlockingBefore();
  auto value = load();
  getBlockingAfter();
  return value;
}

void SynchronizableFixed::setDirty(jsi::Runtime &, const jsi::Value &value) {
  storeChecked(value);
}

void SynchronizableFixed::setBlocking(jsi::Runtime &, const jsi::Value &value) {
  setBlockingBefore();
  storeChecked(value);
  setBlockingAfter();
}

void SynchronizableFixed::storeChecked(const jsi::Value &value) {
  std::visit(
      [&value](auto &atomic) {
        using TAtomic = std::decay_t<decltype(atomic)>;
        if constexpr (std::is_same_v<TAtomic, std::atomic<double>>) {
          react_native_assert(value.isNumber() && "[Worklets] Expected a number for a fixed-type Synchronizable.");
          if (value.isNumber()) {
            atomic.store(value.getNumber());
          }
        } else {
          react_native_assert(value.isBool() && "[Worklets] Expected a boolean for a fixed-type Synchronizable.");
          if (value.isBool()) {
            atomic.store(value.getBool());
          }
        }
      },
      value_);
}

jsi::Value SynchronizableFixed::load() const {
  return std::visit([](const auto &atomic) { return jsi::Value(atomic.load()); }, value_);
}

} // namespace worklets
