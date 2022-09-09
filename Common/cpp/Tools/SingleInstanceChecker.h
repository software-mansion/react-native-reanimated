#pragma once

#include <iostream>
#include <string>

namespace reanimated {

using namespace std;

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

  inline static int instanceCount;
};

template <class T>
SingleInstanceCheker<T>::SingleInstanceCheker() {
  string className = typeid(T).name();

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
