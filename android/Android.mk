LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := reanimated

LOCAL_SRC_FILES := $(wildcard $(LOCAL_PATH)/src/main/cpp/*.cpp)

LOCAL_C_INCLUDES := $(LOCAL_PATH)/src/main/cpp/headers

LOCAL_CFLAGS += -fvisibility=hidden -fexceptions -frtti

LOCAL_STATIC_LIBRARIES := libjsi libjsireact jscruntime
LOCAL_SHARED_LIBRARIES := libfolly_json libfb libreactnativejni

include $(BUILD_SHARED_LIBRARY)