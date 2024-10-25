#include <reanimated/android/JNIHelper.h>

namespace reanimated {

facebook::jni::local_ref<JNIHelper::PropsMap> JNIHelper::PropsMap::create() {
  return newInstance();
}

void JNIHelper::PropsMap::put(
    const std::string &key,
    facebook::jni::local_ref<JObject> object) {
  static auto method = getClass()
                           ->getMethod<jobject(
                               facebook::jni::local_ref<JObject>,
                               facebook::jni::local_ref<JObject>)>("put");
  method(self(), facebook::jni::make_jstring(key), object);
}

facebook::jni::local_ref<JNIHelper::PropsMap> JNIHelper::ConvertToPropsMap(
    facebook::jsi::Runtime &rt,
    const facebook::jsi::Object &props) {
  auto map = PropsMap::create();

  auto propNames = props.getPropertyNames(rt);
  for (size_t i = 0, size = propNames.size(rt); i < size; i++) {
    auto jsiKey = propNames.getValueAtIndex(rt, i).asString(rt);
    auto value = props.getProperty(rt, jsiKey);
    auto key = jsiKey.utf8(rt);
    if (value.isUndefined() || value.isNull()) {
      map->put(key, nullptr);
    } else if (value.isBool()) {
      map->put(key, facebook::jni::JBoolean::valueOf(value.getBool()));
    } else if (value.isNumber()) {
      map->put(key, facebook::jni::autobox(value.asNumber()));
    } else if (value.isString()) {
      map->put(key, facebook::jni::make_jstring(value.asString(rt).utf8(rt)));
    } else if (value.isObject()) {
      if (value.asObject(rt).isArray(rt)) {
        map->put(
            key,
            facebook::react::ReadableNativeArray::newObjectCxxArgs(
                facebook::jsi::dynamicFromValue(rt, value)));
      } else {
        map->put(
            key,
            facebook::react::ReadableNativeMap::newObjectCxxArgs(
                facebook::jsi::dynamicFromValue(rt, value)));
      }
    }
  }

  return map;
}

}; // namespace reanimated
