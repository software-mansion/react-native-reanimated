#pragma once

#include <jsi/jsi.h>
#include <algorithm>
#include <string>
#include <type_traits>
#include <vector>

namespace reanimated::css {

using namespace facebook;

/** Stable, collision-free byte representation of a JSI value.
 *  - Two semantically equal values produce identical canonical form
 *    (order-independent for object keys).
 *  - Supported types: null / undefined, bool, number, string, array, plain
 *    object (no functions, symbols, proxies…).
 */
std::string toCanonicalForm(jsi::Runtime &rt, const jsi::Value &value);

} // namespace reanimated::css
