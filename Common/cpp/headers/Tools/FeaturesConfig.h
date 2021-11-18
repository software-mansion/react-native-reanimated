#pragma once
#include <string>

class FeaturesConfig {
 public:
  static bool isLayoutAnimationEnabled() {
    return _isLayoutAnimationEnabled;
  }
  static void setLayoutAnimationEnabled(bool isLayoutAnimationEnabled) {
    _isLayoutAnimationEnabled = isLayoutAnimationEnabled;
  }

 private:
  static bool _isLayoutAnimationEnabled;
};
