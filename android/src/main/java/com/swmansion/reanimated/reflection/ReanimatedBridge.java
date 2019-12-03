package com.swmansion.reanimated.reflection;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.nodes.ConnectedNode;

public class ReanimatedBridge {
    public interface ReadableCollection {
        boolean has(Object key);
        @Nullable
        Object value(Object key);
        <T extends Object> T value(Object key, Class<T> type);
    }

    public interface ReanimatedArray extends WritableArray, ReadableCollection, WritableArrayResolver.Resolvable {
        void pushDynamic(Object value);
    }

    public interface ReanimatedAccessor extends ConnectedNode {
        void call(int[] params, NodesManager nodesManager);
    }

    public interface ReanimatedMap extends WritableMap, ReadableCollection {
        void putDynamic(String name, Object value);
    }
}
