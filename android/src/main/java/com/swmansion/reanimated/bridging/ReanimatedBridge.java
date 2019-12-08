package com.swmansion.reanimated.bridging;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.nodes.ConnectedNode;

public class ReanimatedBridge {
    public interface ReadableCollection {
        boolean has(Object key);
        @Nullable Object value(Object key);
        <T> T value(Object key, Class<T> type);
        Object source();
    }

    public interface ReanimatedArray extends WritableArray, ReadableArrayResolver.Resolvable {
        void pushDynamic(Object value);
        ReadableArrayResolver resolver();
    }

    public interface ReanimatedMap extends WritableMap, ReadableMapResolver.Resolvable {
        void putDynamic(String name, Object value);
        ReadableMapResolver resolver();
    }

    public interface ReanimatedAccessor extends ConnectedNode {
        void call(int[] params, NodesManager nodesManager);
    }

}
