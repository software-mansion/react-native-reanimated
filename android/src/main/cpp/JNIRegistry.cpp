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
        std::string methodSignature,
        JNIMethodMode methodMode,
        JNIEnv *currentEnv) {
    currentEnv = (currentEnv == nullptr) ? this->env : currentEnv;
    Logger::log(std::string("[JNIRegistry] HERE Entering getClassAndMethod with args: " + className + "|" + methodName + "|" + methodSignature).c_str());
    jclass classPtr = nullptr;
    jmethodID methodPtr = nullptr;
    // check if class is already stored, if not, try to obtain it
    Logger::log(std::string("[JNIRegistry] looknig for stored class " + className).c_str());
    auto classIt = this->classes.find(className);
    if (classIt != this->classes.end()) { // found
        Logger::log("[JNIRegistry] stored class found");
        classPtr = classIt->second;
    } else { // not found
        Logger::log("[JNIRegistry] stored class not found");
        classPtr = currentEnv->FindClass(className.c_str());
        // register obtained class
        //this->classes.insert(std::pair<std::string, jclass>(className, classPtr));
    }
    // check if method is already stored, if not, try to obtain it
    std::string methodKey = this->generateMethodKey(className, methodName, methodSignature);
    Logger::log(std::string("[JNIRegistry] looknig for stored method " + methodName + "|" + methodSignature).c_str());
    auto methodIt = this->methods.find(methodKey);
    if (methodIt != this->methods.end()) { // found
        Logger::log("[JNIRegistry] stored method found");
        methodPtr = methodIt->second;
    } else { // not found
        Logger::log("[JNIRegistry] stored method not found");
        switch(methodMode) {
            case JNIMethodMode::standard_method: {
                methodPtr = currentEnv->GetMethodID(classPtr, methodName.c_str(), methodSignature.c_str());
                break;
            }
            case JNIMethodMode::static_method: {
                methodPtr = currentEnv->GetStaticMethodID(classPtr, methodName.c_str(), methodSignature.c_str());
                break;
            }
            default: {
                Logger::log("unhandled method mode detected");
                throw std::invalid_argument("unhandled method mode detected");
            }
        }
        // register obtained method
        //this->methods.insert(std::pair<std::string, jmethodID>(methodKey, methodPtr));
    }

    return std::make_tuple(classPtr, methodPtr);
}
