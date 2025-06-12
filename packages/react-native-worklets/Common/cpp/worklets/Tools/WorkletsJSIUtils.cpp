#include <worklets/Tools/WorkletsJSIUtils.h>

#include <react/debug/react_native_assert.h>

#include <memory>
#include <sstream>
#include <vector>

using namespace facebook;

namespace worklets::jsi_utils {

jsi::Array convertStringToArray(
    jsi::Runtime &rt,
    const std::string &value,
    const unsigned int expectedSize) {
  std::vector<float> transformMatrixList;
  std::istringstream stringStream(value);
  std::copy(
      std::istream_iterator<float>(stringStream),
      std::istream_iterator<float>(),
      std::back_inserter(transformMatrixList));
  react_native_assert(
      transformMatrixList.size() == expectedSize &&
      "Transform matrix list size is different than expected");
  jsi::Array matrix(rt, expectedSize);
  for (unsigned int i = 0; i < expectedSize; i++) {
    matrix.setValueAtIndex(rt, i, transformMatrixList[i]);
  }
  return matrix;
}

jsi::Object optimizedFromHostObject(
    jsi::Runtime &rt,
    std::shared_ptr<jsi::HostObject> &&hostObject) {
  auto optimizedObject = jsi::Object(rt);
  for (const auto &propertyName : hostObject->getPropertyNames(rt)) {
    optimizedObject.setProperty(
        rt, propertyName, hostObject->get(rt, propertyName));
  }
  return optimizedObject;
}

} // namespace worklets::jsi_utils
