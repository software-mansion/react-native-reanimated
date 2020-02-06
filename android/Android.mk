LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

$(warning $(LOCAL_PATH))
HERMES_ENGINE := $(LOCAL_PATH)/../Example/node_modules/Hermes-engine
$(warning $(Hermes-engine))
$(warning $(Hermes-engine)/android/include)


LOCAL_MODULE := reanimated

PROJECT_FILES := $(wildcard $(LOCAL_PATH)/src/main/cpp/*.cpp)
PROJECT_FILES += $(wildcard $(LOCAL_PATH)/../Common/cpp/*.cpp)

PROJECT_FILES := $(PROJECT_FILES:$(LOCAL_PATH)/%=%)

LOCAL_SRC_FILES := $(PROJECT_FILES)

LOCAL_C_INCLUDES := $(LOCAL_PATH)/src/main/cpp/headers $(LOCAL_PATH)/../Common/cpp/headers $(HERMES_ENGINE)/android/include 

LOCAL_CFLAGS += -DONANDROID -fvisibility=hidden -fexceptions -frtti

LOCAL_STATIC_LIBRARIES := libjsi libjsireact libjscallinvoker jscallinvokerholder
LOCAL_SHARED_LIBRARIES := libfolly_json libfb libreactnativejni libhermes

include $(BUILD_SHARED_LIBRARY)