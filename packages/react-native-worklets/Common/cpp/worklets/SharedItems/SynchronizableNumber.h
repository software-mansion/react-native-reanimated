#include <jsi/jsi.h>
#include <worklets/SharedItems/Synchronizable.h>

namespace worklets {

template <>
jsi::Value SynchronizableConverter<double>::jsValue(
    jsi::Runtime &rt,
    double value);

template <>
double SynchronizableConverter<double>::hostValue(
    jsi::Runtime &rt,
    const jsi::Value &value);

}; // namespace worklets
