package com.swmansion.reanimated.reflection;

import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableNativeMap;
import com.swmansion.reanimated.NodesManager;

public class ReanimatedReflectionHelper {
    private static final String CONFIG_KEYS_MODULE = "module";
    private static final String CONFIG_KEYS_METHOD = "method";
    private static final String CONFIG_KEYS_COMMAND = "command";
    private static final String CONFIG_KEYS_EVENT = "event";

    private final JSEventDispatcherAccessor jsEventDispatcherAccessor;
    private final ReactContext context;

    public ReanimatedReflectionHelper(NodesManager nodesManager) {
        context = nodesManager.getContext();
        jsEventDispatcherAccessor = new JSEventDispatcherAccessor(nodesManager);
    }

    public final JSEventDispatcherAccessor JSEventDispatcher() {
        return jsEventDispatcherAccessor;
    }

    public static ReanimatedBridge.ReanimatedAccessor getInstance(ReactContext context, ReadableMap config){
        String moduleName = config.getString(CONFIG_KEYS_MODULE);

        if (config.hasKey(CONFIG_KEYS_METHOD) && config.getType(CONFIG_KEYS_METHOD).equals(ReadableType.String)) {
            return new ReactMethodAccessor(context, moduleName, config.getString(CONFIG_KEYS_METHOD));
        } else if (config.hasKey(CONFIG_KEYS_COMMAND)) {
            return new ViewManagerAccessor(context, moduleName, config.getDynamic(CONFIG_KEYS_COMMAND));
        } else {
            throw new JSApplicationIllegalArgumentException("Missing method/command arg in animated invoke");
        }
    }

    public WritableNativeMap getDevUtil() {
        WritableNativeMap data = NativeModuleAccessor.getReflectionMap(context);
        data.putMap("JSEvents", jsEventDispatcherAccessor.getDevUtil());
        return data;
    }
}
