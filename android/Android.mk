LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

$(warning $(LOCAL_PATH))
HERMES_ENGINE := $(LOCAL_PATH)/../Example/node_modules/hermes-engine
$(warning $(Hermes-engine))
$(warning $(Hermes-engine)/android/include)


LOCAL_MODULE := reanimated

PROJECT_FILES := $(wildcard $(LOCAL_PATH)/src/main/cpp/*.cpp)
PROJECT_FILES += $(wildcard $(LOCAL_PATH)/../Common/cpp/*.cpp)
PROJECT_FILES += $(wildcard $(LOCAL_PATH)/../Common/cpp/**/*.cpp)

PROJECT_FILES := $(PROJECT_FILES:$(LOCAL_PATH)/%=%)

LOCAL_SRC_FILES := $(PROJECT_FILES)

LOCAL_C_INCLUDES := \
	$(LOCAL_PATH)/src/main/cpp/headers \
	$(LOCAL_PATH)/../Common/cpp/headers \
	$(LOCAL_PATH)/../Common/cpp/headers/NativeModules \
	$(LOCAL_PATH)/../Common/cpp/headers/Registries \
	$(LOCAL_PATH)/../Common/cpp/headers/SharedItems \
	$(LOCAL_PATH)/../Common/cpp/headers/SpecTools \
	$(LOCAL_PATH)/../Common/cpp/headers/Tools \
	$(HERMES_ENGINE)/android/include 

LOCAL_CFLAGS += -DONANDROID -fvisibility=hidden -fexceptions -frtti

LOCAL_STATIC_LIBRARIES := libjsi libjsireact libcallinvoker callinvokerholder
LOCAL_SHARED_LIBRARIES := libfolly_json libfb libreactnativejni libhermes libfbjni

include $(BUILD_SHARED_LIBRARY)