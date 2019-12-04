package com.swmansion.reanimated.reflection;

import android.util.Log;
import android.util.SparseArray;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.CatalystInstanceImpl;
import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.bridge.JavaScriptModuleRegistry;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;
import com.swmansion.reanimated.BuildConfig;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ValueManagingNode;

import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import static com.swmansion.reanimated.nodes.DebugNode.TAG;

public class JSEventDispatcherAccessor implements RCTDeviceEventEmitter, RCTNativeAppEventEmitter {

    private final NodesManager mNodesManager;
    private final Map<String, SparseArray<String>> eventRegistry = new HashMap<>();
    private final Map<String, Object> mDevUtil = new HashMap<>();

    JSEventDispatcherAccessor(NodesManager nodesManager) {
        mNodesManager = nodesManager;
        Map<Class<? extends JavaScriptModule>, JavaScriptModule> mModuleInstances = getModuleInstances(mNodesManager.getContext());
        final RCTDeviceEventEmitter deviceEventEmitter = (RCTDeviceEventEmitter) mModuleInstances
                .get(RCTDeviceEventEmitter.class);
        final RCTNativeAppEventEmitter appEventEmitter = (RCTNativeAppEventEmitter) mModuleInstances
                .get(RCTNativeAppEventEmitter.class);

        mModuleInstances.put(
                RCTDeviceEventEmitter.class,
                new RCTDeviceEventEmitter() {
                    @Override
                    public void emit(@NonNull String eventName, @Nullable Object data) {
                        JSEventDispatcherAccessor.this.emit(eventName, data);
                        deviceEventEmitter.emit(eventName, data);
                    }
                }
        );

        mModuleInstances.put(
                RCTNativeAppEventEmitter.class,
                new RCTNativeAppEventEmitter() {
                    @Override
                    public void emit(String eventName, @Nullable Object data) {
                        JSEventDispatcherAccessor.this.emit(eventName, data);
                        appEventEmitter.emit(eventName, data);
                    }
                }
        );
    }

    @Override
    public void emit(@NonNull final String eventName, @Nullable final Object data) {
        final Object clone = ReflectionUtils.nativeCloneDeep(data);
        if (UiThreadUtil.isOnUiThread()) {
            receiveEvent(eventName, clone);
        } else {
            UiThreadUtil.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    receiveEvent(eventName, clone);
                }
            });
        }
    }

    private void receiveEvent(@NonNull String eventName, @Nullable Object data) {
        SparseArray<String> registry = eventRegistry.get(eventName);
        Node node;
        int nodeID;

        if (registry != null) {
            for (int i = 0; i < registry.size(); i++) {
                nodeID = registry.keyAt(i);
                node = mNodesManager.findNodeById(nodeID, Node.class);
                Log.d(TAG, "emit: " + nodeID + "  "    +        node.getClass().getSimpleName());
                ((ValueManagingNode) node).setValue(data);
            }
        } else if (BuildConfig.DEBUG && !mDevUtil.containsKey(eventName) && data != null) {
            //  dev util
            Log.d(TAG, String.format("Reanimated intercept('%s', %s)", eventName, ReflectionUtils.nativeCloneDeep(data)));
            mDevUtil.put(eventName, data);
        }
    }

    public void attach(int nodeID, String eventName) {
        if (!eventRegistry.containsKey(eventName)) {
            eventRegistry.put(eventName, new SparseArray<String>());
        }
        eventRegistry.get(eventName).put(nodeID, eventName + nodeID);
    }

    public void detach(int nodeID, String eventName) {
        if (eventRegistry.containsKey(eventName)) {
            SparseArray<String> registry = eventRegistry.get(eventName);
            registry.remove(nodeID);
        }
    }

    public final WritableNativeMap getDevUtil() {
        ReanimatedWritableNativeMap out = new ReanimatedWritableNativeMap();
        Iterator<Map.Entry<String, Object>> data = mDevUtil.entrySet().iterator();
        Map.Entry<String, Object> entry;
        while (data.hasNext()) {
            entry = data.next();
            out.putDynamic(entry.getKey(), entry.getValue());
        }

        return out;
    }

    @SuppressWarnings("unchecked cast")
    private static HashMap<Class<? extends JavaScriptModule>, JavaScriptModule> getModuleInstances(ReactContext context) {
        try {
            //  ReactAndroid/src/main/java/com/facebook/react/bridge/CatalystInstanceImpl.java
            Field jsModuleRegistryField = CatalystInstanceImpl.class.getDeclaredField("mJSModuleRegistry");
            //  ReactAndroid/src/main/java/com/facebook/react/bridge/JavaScriptModuleRegistry.java
            Field moduleInstancesField = JavaScriptModuleRegistry.class.getDeclaredField("mModuleInstances");
            jsModuleRegistryField.setAccessible(true);
            moduleInstancesField.setAccessible(true);
            JavaScriptModuleRegistry javaScriptModuleRegistry =
                    (JavaScriptModuleRegistry) jsModuleRegistryField.get(context.getCatalystInstance());
            return (HashMap<Class<? extends JavaScriptModule>, JavaScriptModule>) moduleInstancesField.get(javaScriptModuleRegistry);
        } catch (Throwable throwable) {
            throwable.printStackTrace();
            throw new JSApplicationCausedNativeException("Reanimated intercept critical error", throwable);
        }
    }
}
