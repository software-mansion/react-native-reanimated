#pragma once

#include <iostream>
#include <string>

namespace reanimated {

using namespace std;

// This is a class that counts how many instances of a different class there
// are. It is meant only to be used with classes that should only have one
// instance.

template <class T>
class SingleInstanceCheker {
 public:
  SingleInstanceCheker();
  ~SingleInstanceCheker();

 private:
  void assertWithMessage(bool condition, string message) {
    if (!condition) {
      cerr << message << endl;
      assert(condition);
    }
  }

  // A static field will exist separatley for every class template.
  inline static int instanceCount;
};

template <class T>
SingleInstanceCheker<T>::SingleInstanceCheker() {
  // This gives us a slightly magled class name, but it is still readable
  // in debug.
  string className = typeid(T).name();

  // Only one instance should exist, but it is possible for two instances
  // to co-exist during a reload.
  assertWithMessage(
      instanceCount <= 1,
      "More than one instance of " + className +
          " present. This may indicate a memory leak due to a retain cycle.");

  instanceCount++;
}

template <class T>
SingleInstanceCheker<T>::~SingleInstanceCheker() {
  instanceCount--;
}

} // namespace reanimated
