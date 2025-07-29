#include <jsi/jsi.h>
#include <worklets/SharedItems/Synchronizable.h>

namespace worklets {

template <>
jsi::Value SynchronizableConverter<bool>::jsValue(
    jsi::Runtime &rt,
    const bool &value);

template <>
bool SynchronizableConverter<bool>::hostValue(
    jsi::Runtime &rt,
    const jsi::Value &value);

}; // namespace worklets
