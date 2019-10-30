// put this file to node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/jscexecutor

#include <fb/fbjni.h>
#include <fb/log.h>
#include <jsi/jsi.h>
#include <jni.h>

using namespace facebook;

extern "C" {
    JNIEXPORT void JNICALL 
    Java_com_swmansion_reanimated_ReanimatedModule_installJSI(
      JNIEnv *env,
      jobject thiz,
      jlong runtimePtr
    );
}

class ReanimatedJSI : public jsi::HostObject {
private:
  // jclass _moduleClass;
  jobject _moduleObject;
  jmethodID _createNode;
  jmethodID _dropNode;
  jmethodID _connectNodes;
  jmethodID _disconnectNodes;
  jmethodID _connectNodeToView;
  jmethodID _disconnectNodeFromView;
  jmethodID _attachEvent;
  jmethodID _detachEvent;
  jmethodID _getValue;

public:
  ReanimatedJSI(
    // jclass moduleClass,
    jobject moduleObject,
    jmethodID createNode,
    jmethodID dropNode,
    jmethodID connectNodes,
    jmethodID disconnectNodes,
    jmethodID connectNodeToView,
    jmethodID disconnectNodeFromView,
    jmethodID attachEvent,
    jmethodID detachEvent,
    jmethodID getValue
  );

  static void install(
  jsi::Runtime &runtime,
    const std::shared_ptr<ReanimatedJSI> module
  );

  jsi::Value get(jsi::Runtime &runtime, const jsi::PropNameID &name) override;
};
