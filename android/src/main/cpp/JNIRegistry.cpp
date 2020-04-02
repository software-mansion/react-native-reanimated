#include "JNIRegistry.h"
#include <memory>

JNIRegistry::JNIRegistry(JNIEnv* env, JavaVM* vm) {
    this->env = env;
    this->vm = vm;

    classes.push_back({ "com/swmansion/reanimated/Scheduler", nullptr, nullptr });
    classes.push_back({ "java/lang/Double", nullptr, nullptr });
    classes.push_back({ "java/util/ArrayList", nullptr, nullptr });
    classes.push_back({ "android/util/Pair", nullptr, nullptr });
    classes.push_back({ "java/lang/Integer", nullptr, nullptr });

    methods.push_back({ &classes[JavaClassesUsed::ReanimatedScheduler], "scheduleTriggerOnUI", "()Z", nullptr });
    methods.push_back({ &classes[JavaClassesUsed::ReanimatedScheduler], "scheduleTriggerOnJS", "()Z", nullptr });
    methods.push_back({ &classes[JavaClassesUsed::Double], "valueOf", "(D)Ljava/lang/Double;", nullptr });
    methods.push_back({ &classes[JavaClassesUsed::ArrayList], "<init>", "()V", nullptr });
    methods.push_back({ &classes[JavaClassesUsed::ArrayList], "add", "(Ljava/lang/Object;)Z", nullptr });
    methods.push_back({ &classes[JavaClassesUsed::Pair], "<init>", "(Ljava/lang/Object;Ljava/lang/Object;)V", nullptr });
    methods.push_back({ &classes[JavaClassesUsed::Integer], "valueOf", "(I)Ljava/lang/Integer;", nullptr });
}

std::tuple<jclass, jmethodID> JNIRegistry::getClassAndMethod(
        JavaMethodsUsed method,
        JNIMethodMode methodMode,
        JNIEnv *currentEnv) {
    currentEnv = (currentEnv == nullptr) ? this->env : currentEnv;

    JNIRegistryClass *classPtr = methods[method].clazz;
    if (classPtr->clazz == nullptr) {
        classPtr->globalRefEnv = currentEnv;
        classPtr->vm = vm;
        
        classPtr->vm->AttachCurrentThread(&classPtr->globalRefEnv, NULL);
        jclass jc = classPtr->globalRefEnv->FindClass(classPtr->name.c_str());
        classPtr->clazz = (jclass)classPtr->globalRefEnv->NewGlobalRef(jc);
    }
    if (methods[method].methodId == nullptr) {
        switch(methodMode) {
            case JNIMethodMode::standard_method: {
                methods[method].methodId = currentEnv->GetMethodID(
                    classPtr->clazz,
                    methods[method].name.c_str(),
                    methods[method].signature.c_str());
                break;
            }
            case JNIMethodMode::static_method: {
                methods[method].methodId = currentEnv->GetStaticMethodID(
                    classPtr->clazz,
                    methods[method].name.c_str(),
                    methods[method].signature.c_str());
                break;
            }
            default: {
                throw std::invalid_argument("unhandled method mode detected");
            }
        }
    }
    return std::make_tuple(methods[method].clazz->clazz, methods[method].methodId);
}
