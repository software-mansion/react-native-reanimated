//
// Created by Karol Bisztyga on 2020-03-23
//

#ifndef REANIMATEDEXAMPLE_JNI_REGISTRY_H
#define REANIMATEDEXAMPLE_JNI_REGISTRY_H

#include <vector>
#include <string>
#include <jni.h>
#include <tuple>
#include "Logger.h"

enum class JNIMethodMode {
    standard_method,
    static_method,
};

enum JavaClassesUsed {
    ReanimatedUtils = 0,
    ReanimatedScheduler = 1,
    Double = 2,
    ArrayList = 3,
    Pair = 4,
    Integer = 5,
};

enum JavaMethodsUsed {
    RaiseException = 0,
    TriggerOnUI = 1,
    TriggerOnJS = 2,
    DoubleValueOf = 3,
    ArrayListInit = 4,
    ArrayListAdd = 5,
    PairInit = 6,
    IntegerValueOf = 7,
};

struct JNIRegistryClass {
    std::string name;
    jclass clazz;
    JNIEnv* globalRefEnv;
    JavaVM *vm;

    ~JNIRegistryClass() {
        if (globalRefEnv != nullptr && clazz != nullptr) {
            vm->AttachCurrentThread(&globalRefEnv, NULL);
            globalRefEnv->DeleteGlobalRef(clazz);
        }
    }
};

struct JNIRegistryMethod {
    JNIRegistryClass *clazz;
    std::string name;
    std::string signature;
    jmethodID methodId;
};

class JNIRegistry {
    JavaVM* vm;
    JNIEnv* env;
    std::vector<JNIRegistryClass> classes;
    std::vector<JNIRegistryMethod> methods;
  public:
    JNIRegistry(JNIEnv* env, JavaVM* vm);
    std::tuple<jclass, jmethodID> getClassAndMethod(
        JavaMethodsUsed method,
        JNIMethodMode methodMode = JNIMethodMode::standard_method,
        JNIEnv *currentEnv = nullptr);
    virtual ~JNIRegistry() {}
};

#endif //REANIMATEDEXAMPLE_JNI_REGISTRY_H
