//
// Created by Szymon Kapala on 2020-02-11.
//

#include "SharedValueRegistry.h"

#include <android/log.h>
#define APPNAME "NATIVE_REANIMATED"

void SharedValueRegistry::registerSharedValue(int id, std::shared_ptr<SharedValue> ptr) {
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "dodaje %d", id);
  sharedValueMap[id] = ptr;
}

void SharedValueRegistry::unregisterSharedValue(int id) {
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "usuwam %d", id);
  sharedValueMap.erase(id);
}

std::shared_ptr<SharedValue> SharedValueRegistry::getSharedValue(int id) {
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "pytam %d", id);
  return sharedValueMap[id];
}
