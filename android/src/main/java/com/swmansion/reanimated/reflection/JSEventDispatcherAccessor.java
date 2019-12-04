package com.swmansion.reanimated.reflection;

import android.util.SparseArray;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.CatalystInstanceImpl;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.bridge.JavaScriptModuleRegistry;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ValueManagingNode;

import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.Map;

public class JSEventDispatcherAccessor implements RCTDeviceEventEmitter, RCTNativeAppEventEmitter {
    private final static String NAME = "intercept";
    private final NodesManager mNodesManager;
    private final Map<String, SparseArray<String>> eventRegistry = new HashMap<>();

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
                        emit(eventName, data);
                        deviceEventEmitter.emit(eventName, data);
                    }
                }
        );

        mModuleInstances.put(
                RCTNativeAppEventEmitter.class,
                new RCTNativeAppEventEmitter() {
                    @Override
                    public void emit(String eventName, @Nullable Object data) {
                        emit(eventName, data);
                        appEventEmitter.emit(eventName, data);
                    }
                }
        );
    }

    @Override
    public void emit(@NonNull String eventName, @Nullable Object data) {
        SparseArray<String> registry = eventRegistry.get(eventName);
        Node node;
        int nodeID;
        if (registry != null) {
            for (int i = 0; i < registry.size(); i++) {
                nodeID = registry.keyAt(i);
                node = mNodesManager.findNodeById(nodeID, Node.class);
                ((ValueManagingNode) node).setValue(data);
            }
        }
    }

    public void attach(int nodeID, String eventName) {
        Node node = mNodesManager.findNodeById(nodeID, Node.class);
        if (!(node instanceof ValueManagingNode)) {
            throw new JSApplicationIllegalArgumentException(
                    String.format("Unsupported node type %s passed to %s", node.getClass().getSimpleName(), NAME)
            );
        }

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

    @SuppressWarnings("unchecked cast")
    private static HashMap<Class<? extends JavaScriptModule>, JavaScriptModule> getModuleInstances(ReactContext context) {
        try {
            Field jsModuleRegistryField = CatalystInstanceImpl.class.getDeclaredField("mJSModuleRegistry");
            Field moduleInstancesField = JavaScriptModuleRegistry.class.getDeclaredField("mModuleInstances");
            jsModuleRegistryField.setAccessible(true);
            moduleInstancesField.setAccessible(true);
            JavaScriptModuleRegistry javaScriptModuleRegistry =
                    (JavaScriptModuleRegistry) jsModuleRegistryField.get(context.getCatalystInstance());
            return (HashMap<Class<? extends JavaScriptModule>, JavaScriptModule>) moduleInstancesField.get(javaScriptModuleRegistry);
        } catch (NoSuchFieldException e) {
            e.printStackTrace();
        } catch (IllegalAccessException e) {
            e.printStackTrace();
        }

        return null;
    }
}
