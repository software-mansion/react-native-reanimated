#pragma once

#include <folly/dynamic.h>
#include <jsi/jsi.h>

namespace reanimated {
namespace reanimatedFolly {

        facebook::jsi::Value valueFromDynamic(
                facebook::jsi::Runtime& runtime,
                const folly::dynamic& dyn);

        folly::dynamic dynamicFromValue(
                facebook::jsi::Runtime& runtime,
                const facebook::jsi::Value& value);

}
}