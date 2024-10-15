#pragma once

namespace reanimated {

class TransformMatrix {
 public:
  TransformMatrix() {}

  static TransformMatrix Identity() {
    return TransformMatrix();
  }
};

} // namespace reanimated
