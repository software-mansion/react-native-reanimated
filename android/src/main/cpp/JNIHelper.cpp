#include "JNIHelper.h"

namespace reanimated {

using namespace facebook::jni;
using namespace facebook;
using namespace react;

local_ref<JNIHelper::PropsMap> JNIHelper::PropsMap::create() {
  return newInstance();
}

void JNIHelper::PropsMap::put(
    const std::string &key,
    jni::local_ref<JObject> object) {
  static auto method =
      getClass()
          ->getMethod<jobject(
              jni::local_ref<JObject>, jni::local_ref<JObject>)>("put");
  method(self(), jni::make_jstring(key), object);
}

jni::local_ref<JNIHelper::PropsMap> JNIHelper::convertJSIObjectToJNIMap(
    jsi::Runtime &rt,
    const jsi::Object &jsiObject) {
  auto map = PropsMap::create();

  auto propNames = jsiObject.getPropertyNames(rt);
  for (size_t i = 0, size = propNames.size(rt); i < size; i++) {
    auto jsiKey = propNames.getValueAtIndex(rt, i).asString(rt);
    auto value = jsiObject.getProperty(rt, jsiKey);
    auto key = jsiKey.utf8(rt);
    if (value.isUndefined() || value.isNull()) {
      map->put(key, nullptr);
    } else if (value.isBool()) {
      map->put(key, JBoolean::valueOf(value.getBool()));
    } else if (value.isNumber()) {
      map->put(key, jni::autobox(value.asNumber()));
    } else if (value.isString()) {
      map->put(key, jni::make_jstring(value.asString(rt).utf8(rt)));
    } else if (value.isObject()) {
      if (value.asObject(rt).isArray(rt)) {
        map->put(
            key,
            ReadableNativeArray::newObjectCxxArgs(
                jsi::dynamicFromValue(rt, value)));
      } else {
        map->put(
            key,
            ReadableNativeMap::newObjectCxxArgs(
                jsi::dynamicFromValue(rt, value)));
      }
    }
  }
  return map;
}

jsi::Object JNIHelper::convertJNIMapToJSIObject(
  jsi::Runtime &rt,
  const jni::alias_ref<JMap<JString, JObject>> jniMap) {
  static const auto booleanClass = jni::JBoolean::javaClassStatic();
  static const auto integerClass = jni::JInteger::javaClassStatic();
  static const auto doubleClass = jni::JDouble::javaClassStatic();
  static const auto floatClass = jni::JFloat::javaClassStatic();
  static const auto stringClass = jni::JString::javaClassStatic();
  static const auto arrayFloatClass = jni::JList<JFloat>::javaClassStatic();

  auto object = jsi::Object(rt);
  for (const auto& entry : *jniMap) {
    auto key = entry.first->toStdString();
    if (entry.second->isInstanceOf(booleanClass)){
      object.setProperty(rt, key.c_str(), jni::static_ref_cast<JBoolean>(entry.second)->value() == true);
    } else if (entry.second->isInstanceOf(integerClass)){
      object.setProperty(rt, key.c_str(), jni::static_ref_cast<JInteger>(entry.second)->value());
    } else if (entry.second->isInstanceOf(doubleClass)){
      object.setProperty(rt, key.c_str(), jni::static_ref_cast<JDouble>(entry.second)->value());
    } else if (entry.second->isInstanceOf(floatClass)){
      object.setProperty(rt, key.c_str(), jni::static_ref_cast<JFloat>(entry.second)->value());
    } else if (entry.second->isInstanceOf(stringClass)){
      auto jsiValue = jsi::String::createFromUtf8(rt, jni::static_ref_cast<JString>(entry.second)->toStdString());
      object.setProperty(rt, key.c_str(), jsiValue);
    }
    if (entry.second->isInstanceOf(arrayFloatClass)){
      auto floatArray = jni::static_ref_cast<JList<JFloat>>(entry.second);
      unsigned int arraySize = floatArray->size();
      jsi::Array jsiArray(rt, arraySize);
      int i = 0;
      for (const auto& item : *floatArray) {
        jsiArray.setValueAtIndex(rt, i++, item->value());
      }
      object.setProperty(rt, key.c_str(), jsiArray);
    }
  }
  return object;
}

}; // namespace reanimated
