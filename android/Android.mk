LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

$(warning $(LOCAL_PATH))
HERMES_ENGINE := $(LOCAL_PATH)/../Example/node_modules/Hermes-engine
$(warning $(Hermes-engine))
$(warning $(Hermes-engine)/android/include)


LOCAL_MODULE := reanimated

LOCAL_SRC_FILES := $(wildcard $(LOCAL_PATH)/src/main/cpp/*.cpp)

LOCAL_C_INCLUDES := $(LOCAL_PATH)/src/main/cpp/headers $(HERMES_ENGINE)/android/include



LOCAL_CFLAGS += -fvisibility=hidden -fexceptions -frtti

LOCAL_STATIC_LIBRARIES := libjsi libjsireact
LOCAL_SHARED_LIBRARIES := libfolly_json libfb libreactnativejni libhermes

include $(BUILD_SHARED_LIBRARY)