#include <jsi/jsi.h>
#include <worklets/SharedItems/SynchronizableBool.h>

namespace worklets {

template <>
jsi::Value SynchronizableConverter<bool>::jsValue(
    jsi::Runtime &rt,
    const bool &value) {
  return jsi::Value(value);
}

template <>
bool SynchronizableConverter<bool>::hostValue(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return value.getBool();
}

} // namespace worklets
