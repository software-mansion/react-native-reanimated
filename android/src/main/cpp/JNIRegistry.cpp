#include "JNIRegistry.h"
#include "Logger.h"
#include <memory>

JNIRegistry::JNIRegistry(JNIEnv* env) {
    this->env = env;
}

std::string JNIRegistry::generateMethodKey(
        std::string className,
        std::string methodName,
        std::string methodSignature) const {
    return className + "(" + methodName + "(" + methodSignature + "))";
}

std::tuple<jclass, jmethodID> JNIRegistry::getClassAndMethod(
        std::string className,
        std::string methodName,
        std::string methodSignature) {
    Logger::log(std::string("[JNIRegistry] HERE Entering getClassAndMethod with args: " + className + "/" + methodName + "/" + methodSignature).c_str());
    jclass classPtr = nullptr;
    jmethodID methodPtr = nullptr;
    // check if class is already stored, if not try to obtain it
    Logger::log("[JNIRegistry] looknig for stored class");
    auto classIt = this->classes.find(className);
    if (classIt != this->classes.end()) { // found
        Logger::log("[JNIRegistry] stored class found");
        classPtr = classIt->second;
    } else { // not found
        Logger::log("[JNIRegistry] stored class not found");
        jclass obtainedClass = env->FindClass(className.c_str());
        // register obtained class
        this->classes.insert(std::pair<std::string, jclass>(className, obtainedClass));
        classPtr = std::move(obtainedClass);
    }
    // check if method is already stored, if not try to obtain it
    std::string methodKey = this->generateMethodKey(className, methodName, methodSignature);
    Logger::log("[JNIRegistry] looknig for stored method");
    auto methodIt = this->methods.find(methodKey);
    if (methodIt != this->methods.end()) { // found
        Logger::log("[JNIRegistry] stored method found");
        methodPtr = methodIt->second;
    } else { // not found
        Logger::log("[JNIRegistry] stored method not found");
        jmethodID obtainedMethod = env->GetStaticMethodID(classPtr, methodName.c_str(), methodSignature.c_str());
        // register obtained class
        this->methods.insert(std::pair<std::string, jmethodID>(methodKey, obtainedMethod));
        methodPtr = std::move(obtainedMethod);
    }

    return std::make_tuple(classPtr, methodPtr);
}
