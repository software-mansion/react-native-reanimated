#include <jsi/jsi.h>
#include <worklets/SharedItems/Synchronizable.h>

namespace worklets {

template <>
auto SynchronizableConverter<double>::jsValue(Runtime &rt, const double &value)
    -> JSValue {
  return facebook::jsi::Value(value);
}

template <>
auto SynchronizableConverter<double>::hostValue(
    Runtime &rt,
    const JSValue &value) -> double {
  return value.getNumber();
}

} // namespace worklets
