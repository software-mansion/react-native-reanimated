#include <worklets/Tools/WorkletsJSIUtils.h>

#if __has_include(<React/Debug.h>)
#include <React/Debug.h>
#else
#include <react/debug/react_native_assert.h>
#endif

#include <memory>
#include <sstream>
#include <string>
#include <vector>

using namespace facebook;

namespace worklets::jsi_utils {

jsi::Array convertStringToArray(jsi::Runtime &rt, const std::string &value, const unsigned int expectedSize) {
  std::vector<float> transformMatrixList;
  std::istringstream stringStream(value);
  std::copy(
      std::istream_iterator<float>(stringStream),
      std::istream_iterator<float>(),
      std::back_inserter(transformMatrixList));
  react_native_assert(
      transformMatrixList.size() == expectedSize && "Transform matrix list size is different than expected");
  jsi::Array matrix(rt, expectedSize);
  for (unsigned int i = 0; i < expectedSize; i++) {
    matrix.setValueAtIndex(rt, i, transformMatrixList[i]);
  }
  return matrix;
}

} // namespace worklets::jsi_utils
