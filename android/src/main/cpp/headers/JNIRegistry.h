//
// Created by Karol Bisztyga on 2020-03-23
//

#ifndef REANIMATEDEXAMPLE_JNI_REGISTRY_H
#define REANIMATEDEXAMPLE_JNI_REGISTRY_H

#include <unordered_map>
#include <string>
#include <jni.h>
#include <tuple>

enum class JNIMethodMode {
    standard_method,
    static_method,
};

class JNIRegistry {
    JNIEnv* env;
    // keys are class names
    std::unordered_map<std::string, jclass> classes;
    // keys are: className(methodName(methodSignature))
    std::unordered_map<std::string, jmethodID> methods;

    std::string generateMethodKey(
        std::string className,
        std::string methodName,
        std::string methodSignature) const;
  public:
    JNIRegistry(JNIEnv* env);
    std::tuple<jclass, jmethodID> getClassAndMethod(
        std::string className,
        std::string methodName,
        std::string methodSignature,
        JNIMethodMode methodMode = JNIMethodMode::standard_method,
        JNIEnv *currentEnv = nullptr);
    virtual ~JNIRegistry() {}
};

#endif //REANIMATEDEXAMPLE_JNI_REGISTRY_H
