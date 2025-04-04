#include <worklets/Tools/WorkletsJSIUtils.h>
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
  assert(transformMatrixList.size() == expectedSize);
  jsi::Array matrix(rt, expectedSize);
  for (unsigned int i = 0; i < expectedSize; i++) {
    matrix.setValueAtIndex(rt, i, transformMatrixList[i]);
  }
  return matrix;
}

void installCaches(jsi::Runtime &rt) {
  const auto mapPrototype =
      rt.global().getProperty(rt, "Map").asObject(rt).asFunction(rt);

  rt.global().setProperty(
      rt, "__workletsCache", mapPrototype.callAsConstructor(rt));

  const auto weakMapPrototype =
      rt.global().getProperty(rt, "WeakMap").asObject(rt).asFunction(rt);

  rt.global().setProperty(
      rt, "__handleCache", weakMapPrototype.callAsConstructor(rt));

  rt.global().setProperty(
      rt, "__shareableMappingCache", weakMapPrototype.callAsConstructor(rt));

  const auto symbolPrototype =
      rt.global().getProperty(rt, "Symbol").asObject(rt).asFunction(rt);

  rt.global().setProperty(
      rt,
      "__shareableMappingFlag",
      symbolPrototype.call(
          rt, jsi::String::createFromAscii(rt, "shareable flag")));
}

} // namespace worklets::jsi_utils
