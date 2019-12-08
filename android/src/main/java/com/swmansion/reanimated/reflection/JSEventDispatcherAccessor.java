package com.swmansion.reanimated.reflection;

import android.util.Log;
import android.util.SparseArray;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.CatalystInstanceImpl;
import com.facebook.react.bridge.JSModuleReanimatedHelper;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;
import com.swmansion.reanimated.BuildConfig;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.nodes.Node;
import com.swmansion.reanimated.nodes.ValueManagingNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import static com.swmansion.reanimated.nodes.DebugNode.TAG;

public class JSEventDispatcherAccessor implements RCTDeviceEventEmitter, RCTNativeAppEventEmitter {

    private final NodesManager mNodesManager;
    private final Map<String, ArrayList<ValueManagingNode>> eventRegistry = new HashMap<>();
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
        ArrayList<ValueManagingNode> registry = eventRegistry.get(eventName);

        if (registry != null) {
            for (ValueManagingNode valueManager: registry) {
                valueManager.setValue(data);
            }
        } else if (BuildConfig.DEBUG && !mDevUtil.containsKey(eventName) && data != null) {
            //  dev util
            Log.d(TAG, String.format("Reanimated intercept('%s', %s)", eventName, ReflectionUtils.nativeCloneDeep(data)));
            mDevUtil.put(eventName, data);
        }
    }

    public void attach(String eventName, ValueManagingNode valueManager) {
        if (!eventRegistry.containsKey(eventName)) {
            eventRegistry.put(eventName, new ArrayList<ValueManagingNode>());
        }
        ArrayList<ValueManagingNode> registry = eventRegistry.get(eventName);
        if (registry.lastIndexOf(valueManager) == -1) {
            registry.add(valueManager);
        }
    }

    public void detach(ValueManagingNode valueManager) {
        Iterator<Map.Entry<String, ArrayList<ValueManagingNode>>> iterator = eventRegistry.entrySet().iterator();
        Map.Entry<String, ArrayList<ValueManagingNode>> entry;
        while (iterator.hasNext()) {
            entry = iterator.next();
            entry.getValue().remove(valueManager);
        }
    }

    public final WritableNativeMap getDevUtil() {
        ReanimatedWritableNativeMap out = new ReanimatedWritableNativeMap();
        Iterator<Map.Entry<String, Object>> data = mDevUtil.entrySet().iterator();
        Map.Entry<String, Object> entry;
        while (data.hasNext()) {
            entry = data.next();
            out.putDynamic(entry.getKey(), ReflectionUtils.nativeCloneDeep(entry.getValue()));
        }

        return out;
    }

    @SuppressWarnings("unchecked cast")
    private static HashMap<Class<? extends JavaScriptModule>, JavaScriptModule> getModuleInstances(ReactContext context) {
        return JSModuleReanimatedHelper.getModuleInstances((CatalystInstanceImpl) context.getCatalystInstance());
    }
}
