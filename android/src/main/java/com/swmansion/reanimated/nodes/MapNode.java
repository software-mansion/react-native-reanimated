package com.swmansion.reanimated.nodes;

import android.util.Log;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.reflection.ReanimatedWritableCollection;
import com.swmansion.reanimated.reflection.ReanimatedWritableMap;

import java.util.ArrayList;
import java.util.HashMap;
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

        public ArrayList<String> getPath() {
            ArrayList<String> list = new ArrayList<>();
            for (int i = 0; i < path.length; i++) {
                list.add(i, path[i]);
            }
            return list;
        }

        public Object lookupValue(ReanimatedWritableMap data) {
            ReanimatedWritableMap map = data;
            for (int i = 0; map != null && i < path.length - 1; i++) {
                String key = path[i];
                map = map.hasKey(key) ? map.getMap(key) : null;
            }

            if (map != null) {
                String key = path[path.length - 1];
                return map.value(key);
            }

            return null;
        }

        static ReanimatedWritableCollection buildMap(List<ArgMap> mapping, NodesManager nodesManager) {
            int depth = 0;
            ArrayList<String> path;
            List<String> next;
            List<String> current;
            String key;
            ReanimatedWritableCollection collection;
            ReanimatedWritableCollection map = new ReanimatedWritableCollection();
            HashMap<List<String>, ReanimatedWritableCollection> accumulator = new HashMap<>();

            for (int i = 0; i < mapping.size(); i++) {
                depth = Math.max(depth, mapping.get(i).path.length);
            }
            for (int i = depth; i >= 0; i--) {
                for (ArgMap argMap: mapping) {
                    path = argMap.getPath();

                    if (i < path.size()) {
                        key = path.get(i);
                        collection = new ReanimatedWritableCollection();
                        if(i == path.size() - 1) {
                            collection.putDynamic(key, nodesManager.getNodeValue(argMap.nodeID));

                        } else {
                            current = path.subList(0, i);
                            collection.putMap(key, accumulator.get(current).copy());
                        }

                        if (i == 0) {
                            map.merge(collection);
                        } else {
                            next = path.subList(0, i - 1);
                            if (accumulator.containsKey(next)) {
                                collection.merge(accumulator.get(next).copy());
                            }
                            accumulator.put(next, collection);
                        }
                    }
                }
            }

            return map;
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

    @Nullable
    @Override
    protected Object evaluate() {
        return ArgMap.buildMap(mMapping, mNodesManager);
    }

}
