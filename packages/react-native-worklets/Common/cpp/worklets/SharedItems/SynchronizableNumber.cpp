#include <jsi/jsi.h>
#include <worklets/SharedItems/SynchronizableNumber.h>

namespace worklets {

template <>
jsi::Value SynchronizableConverter<double>::jsValue(
    jsi::Runtime &rt,
    double value) {
  return jsi::Value(value);
}

template <>
double SynchronizableConverter<double>::hostValue(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return value.getNumber();
}

} // namespace worklets
