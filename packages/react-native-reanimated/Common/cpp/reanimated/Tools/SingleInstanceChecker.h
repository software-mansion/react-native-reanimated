#pragma once

#ifndef NDEBUG

#include <react/debug/react_native_assert.h>

#include <cxxabi.h>

#include <atomic>
#include <cassert>
#include <cstdlib>
#include <string>

#ifdef ANDROID
#include <android/log.h>
#else
#include <iostream>
#endif

namespace reanimated {

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
      __android_log_print(ANDROID_LOG_WARN, "Reanimated", "%s", message.c_str());
#else
      std::cerr << "[Reanimated] " << message << std::endl;
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
  char *demangled = __cxxabiv1::__cxa_demangle(typeid(T).name(), nullptr, nullptr, &status);
  std::string className = (status == 0 && demangled != nullptr) ? demangled : typeid(T).name();
  std::free(demangled);

  // React Native can spawn up to two instances of a Native Module at the same
  // time. This happens during a reload when a new instance of React Native is
  // created while simultaneously the old one is torn down.
  instanceCount_++;
  assertWithMessage(
      instanceCount_ <= 2,
      "[Reanimated] More than two instances of " + className +
          " present. This may indicate a memory leak due to a retain cycle.");
}

template <class T>
SingleInstanceChecker<T>::~SingleInstanceChecker() {
  instanceCount_--;
}

} // namespace reanimated

#endif // NDEBUG
