#pragma once

#ifndef NDEBUG

#include <react/debug/react_native_assert.h>

#include <cxxabi.h>

#include <atomic>
#include <cassert>
#include <iostream>
#include <string>

#ifdef ANDROID
#include <android/log.h>
#endif // ANDROID

namespace worklets {

// This is a class that counts how many instances of a different class there
// are. It is meant only to be used with classes that should only have one
// instance.

template <class T>
class SingleInstanceChecker {
 public:
  SingleInstanceChecker();
  ~SingleInstanceChecker();

 private:
  void assertWithMessage(bool condition, const std::string &message) {
    if (!condition) {
#ifdef ANDROID
      __android_log_print(ANDROID_LOG_WARN, "Worklets", "%s", message.c_str());
#else
      std::cerr << "[Worklets] " << message << std::endl;
#endif

#ifdef IS_REANIMATED_EXAMPLE_APP
      react_native_assert(false && "SingleInstanceChecker failed");
#endif
    }
  }

  // A static field will exist separately for every class template.
  // This has to be inline for automatic initialization.
  inline static std::atomic<int> instanceCount_;
};

template <class T>
SingleInstanceChecker<T>::SingleInstanceChecker() {
  int status = 0;
  std::string className = __cxxabiv1::__cxa_demangle(typeid(T).name(), nullptr, nullptr, &status);

  // React Native can spawn up to two instances of a Native Module at the same
  // time. This happens during a reload when a new instance of React Native is
  // created while simultaneously the old one is torn down.
  instanceCount_++;
  assertWithMessage(
      instanceCount_ <= 2,
      "[Worklets] More than two instances of " + className +
          " present. This may indicate a memory leak due to a retain cycle.");
}

template <class T>
SingleInstanceChecker<T>::~SingleInstanceChecker() {
  instanceCount_--;
}

} // namespace worklets

#endif // NDEBUG
