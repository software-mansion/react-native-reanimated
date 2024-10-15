#pragma once

#include <jsi/jsi.h>

namespace reanimated {

using namespace facebook;

class TransformMatrix {
 public:
  TransformMatrix() {}
  TransformMatrix(jsi::Runtime &rt, const jsi::Value &value);

  jsi::Value toJSIValue(jsi::Runtime &rt) const;

  static TransformMatrix Identity() {
    return TransformMatrix();
  }
};

} // namespace reanimated
