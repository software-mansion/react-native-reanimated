#pragma once

#include "ErrorHandler.h"
#include "Shareables.h"

#include <jsi/jsi.h>
#include <stdio.h>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>

namespace reanimated {

using namespace facebook;

class LayoutAnimationsManager {
 public:
  void configureAnimation(
      int tag,
      const std::string &type,
      std::shared_ptr<Shareable> config);
  bool hasLayoutAnimation(int tag, const std::string &type);
  void startLayoutAnimation(
      jsi::Runtime &rt,
      int tag,
      const std::string &type,
      const jsi::Object &values);
  void clearLayoutAnimationConfig(int tag);

 private:
  std::unordered_map<int, std::shared_ptr<Shareable>> enteringAnimations_;
  std::unordered_map<int, std::shared_ptr<Shareable>> exitingAnimations_;
  std::unordered_map<int, std::shared_ptr<Shareable>> layoutAnimations_;
  mutable std::mutex
      animationsMutex_; // Protects `enteringAnimations_`, `exitingAnimations_`,
                        // `layoutAnimations_` and `viewSharedValues_`.
};

} // namespace reanimated
