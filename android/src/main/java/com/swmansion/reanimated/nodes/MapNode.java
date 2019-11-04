package com.swmansion.reanimated.nodes;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.NodesManager;

import java.util.ArrayList;
import java.util.List;

import javax.annotation.Nullable;

public class MapNode extends Node {
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

        public Double lookupValue(ReadableMap event) {
            ReadableMap map = event;
            for (int i = 0; map != null && i < path.length - 1; i++) {
                String key = path[i];
                map = map.hasKey(key) ? map.getMap(key) : null;
            }
            if (map != null) {
                String key = path[path.length - 1];
                return map.hasKey(key) ? map.getDouble(key) : null;
            }
            return null;
        }

        public Double lookupValue(ReadableArray event) {
            return lookupValue(((ReadableMap) event));
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

    public void setValue(@Nullable WritableMap data){
        if (data == null) {
            throw new IllegalArgumentException("Animated maps must have map data.");
        }

        for (int i = 0; i < mMapping.size(); i++) {
            ArgMap map = mMapping.get(i);
            Double value = map.lookupValue(data);
            if (value != null) {
                mNodesManager.findNodeById(map.nodeID, ValueNode.class).setValue(value);
            }
        }
    }

    public WritableMap getValue(){
        WritableMap map = Arguments.createMap();
        //  build the map
        return map;
    }

    @Override
    protected Double evaluate() {
        return ((double) mNodeID);
    }
}
