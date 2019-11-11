package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.Utils;

import java.util.ArrayList;
import java.util.List;

import javax.annotation.Nullable;

public class MapNode extends ValueNode {
    public static class ArgMap {
        private final int nodeID;
        private final String[] path;

        public ArgMap(ReadableArray eventPath) {
            int size = eventPath.size();
            path = new String[size - 1];
            for (int i = 0; i < size - 1; i++) {
                path[i] = eventPath.getString(i);
            }
            nodeID = eventPath.getInt(size - 1);
        }

        public Object lookupValue(ReadableMap event) {
            ReadableMap map = event;
            for (int i = 0; map != null && i < path.length - 1; i++) {
                String key = path[i];
                map = map.hasKey(key) ? map.getMap(key) : null;
            }
            if (map != null) {
                String key = path[path.length - 1];
                return map.hasKey(key) ? Utils.fromDynamic(map.getDynamic(key)) : null;
            }
            return null;
        }
    }

    public static List<ArgMap> processMapping(ReadableArray mapping) {
        int size = mapping.size();
        List<ArgMap> res = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            res.add(new ArgMap(mapping.getArray(i)));
        }
        return res;
    }

    protected List<ArgMap> mMapping;

    public MapNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mMapping = processMapping(config.getArray("argMapping"));
    }

    public void setValue(Double nodeId) {
        MapNode newMapNode = mNodesManager.findNodeById(nodeId.intValue(), MapNode.class);
        mMapping = newMapNode.mMapping;
    }

    @Override
    public void setValue(Object value) {
        setValue(((WritableMap) value));
    }

    public void setValue(@Nullable WritableMap data) {
        if (data == null) {
            throw new IllegalArgumentException("Animated maps must have map data.");
        }

        for (int i = 0; i < mMapping.size(); i++) {
            ArgMap map = mMapping.get(i);
            Object value = map.lookupValue(data);
            if (value != null) {
                mNodesManager.findNodeById(map.nodeID, ValueNode.class).setValue(value);
            }
        }
    }

    protected WritableMap getValue() {
        Utils.ReanimatedWritableNativeMap value = new Utils.ReanimatedWritableNativeMap();
        WritableMap argVal, accumulator;
        String[] path;

        for (int i = 0; i < mMapping.size(); i++) {
            ArgMap map = mMapping.get(i);
            path = map.path;
            accumulator = new Utils.ReanimatedWritableNativeMap();
            for (int j = path.length - 1; j >= 0; j--) {
                argVal = new Utils.ReanimatedWritableNativeMap();
                if(j == path.length - 1) {
                    Node what = mNodesManager.findNodeById(map.nodeID, Node.class);
                    argVal.putDouble(path[j], what.doubleValue());
                } else {
                    argVal.putMap(path[j], accumulator);
                }
                accumulator = argVal;
            }
            value.merge(accumulator);
        }

        return value;
    }

    @Nullable
    @Override
    protected Object evaluate() {
        return getValue();
    }

}
