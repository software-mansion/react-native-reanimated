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
  static void setByKey(std::string propName) {}

 private:
  static bool _isLayoutAnimationEnabled;
};
