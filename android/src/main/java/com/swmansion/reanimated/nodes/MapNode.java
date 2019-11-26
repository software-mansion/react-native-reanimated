package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.reflection.ReanimatedWritableMap;

import java.util.ArrayList;
import java.util.List;

import javax.annotation.Nullable;

public class MapNode extends ValueNode implements ValueManagingNode {
    public static class ArgMap {
        protected final int nodeID;
        private final String[] path;

        public ArgMap(ReadableArray eventPath) {
            int size = eventPath.size();
            path = new String[size - 1];
            for (int i = 0; i < size - 1; i++) {
                path[i] = eventPath.getString(i);
            }
            nodeID = eventPath.getInt(size - 1);
        }

        public Object lookupValue(ReanimatedWritableMap data) {
            ReanimatedWritableMap map = data;
            for (int i = 0; map != null && i < path.length - 1; i++) {
                String key = path[i];
                map = ((ReanimatedWritableMap) map.value(key));
            }

            if (map != null) {
                String key = path[path.length - 1];
                return map.value(key);
            }
            return null;
        }
    }

    private static List<ArgMap> processMapping(ReadableArray mapping) {
        int size = mapping.size();
        List<ArgMap> res = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            res.add(new ArgMap(mapping.getArray(i)));
        }
        return res;
    }

    private List<ArgMap> mMapping;

    public MapNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mMapping = processMapping(config.getArray("argMapping"));
    }

    public void setValue(int nodeID) {
        MapNode newMapNode = mNodesManager.findNodeById(nodeID, MapNode.class);
        mMapping = newMapNode.mMapping;
    }

    @Override
    public void setValue(Object value) {
        if (value instanceof ReadableArray) {
            setValue(((ReadableArray) value));
        } else if (value instanceof ReadableMap) {
            setValue(((ReadableMap) value));
        } else {
            throw new JSApplicationCausedNativeException(
                    String.format(
                            "Trying to set value %s of illegal type %s on reanimated map #%d",
                            value,
                            value.getClass().getSimpleName(),
                            mNodeID
                    )
            );
        }

    }

    public void setValue(@Nullable ReadableArray data) {
        setValue(ReanimatedWritableMap.fromArray(data));
    }

    public void setValue(@Nullable ReadableMap data) {
        setValue(ReanimatedWritableMap.fromMap(data));
    }

    private void setValue(@Nullable ReanimatedWritableMap data) {
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

    protected ReanimatedWritableMap getValue() {
        ReanimatedWritableMap value = new ReanimatedWritableMap();
        ReanimatedWritableMap argVal, accumulator;
        String[] path;

        for (int i = 0; i < mMapping.size(); i++) {
            ArgMap map = mMapping.get(i);
            path = map.path;
            accumulator = new ReanimatedWritableMap();
            for (int j = path.length - 1; j >= 0; j--) {
                argVal = new ReanimatedWritableMap();
                if(j == path.length - 1) {
                    Node what = mNodesManager.findNodeById(map.nodeID, Node.class);
                    argVal.putDynamic(path[j], what.value());
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
