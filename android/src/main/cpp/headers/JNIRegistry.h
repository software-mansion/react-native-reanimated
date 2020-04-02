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
    ReanimatedScheduler = 0,
    Double = 1,
    ArrayList = 2,
    Pair = 3,
    Integer = 4,
};

enum JavaMethodsUsed {
    TriggerOnUI = 0,
    TriggerOnJS = 1,
    DoubleValueOf = 2,
    ArrayListInit = 3,
    ArrayListAdd = 4,
    PairInit = 5,
    IntegerValueOf = 6,
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
