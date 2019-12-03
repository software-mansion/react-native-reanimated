package com.swmansion.reanimated.nodes;

import android.util.SparseArray;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.reflection.ReanimatedMapBuilder;
import com.swmansion.reanimated.reflection.ReadableCollection;
import com.swmansion.reanimated.reflection.ReanimatedNativeArray;
import com.swmansion.reanimated.reflection.ReanimatedNativeMap;

import java.util.ArrayList;
import java.util.List;

import javax.annotation.Nullable;

public class MapNode extends ValueNode implements ValueManagingNode {
    public static class ArgMap {
        public final int nodeID;
        private final Object[] path;

        ArgMap(ReadableArray eventPath) {
            int size = eventPath.size();
            path = new String[size - 1];
            for (int i = 0; i < size - 1; i++) {
                path[i] = eventPath.getType(i) == ReadableType.Number ? eventPath.getInt(i) : eventPath.getString(i);
            }
            nodeID = eventPath.getInt(size - 1);
        }

        public ArrayList<Object> getPath() {
            ArrayList<Object> list = new ArrayList<>();
            for (int i = 0; i < path.length; i++) {
                list.add(i, path[i]);
            }
            return list;
        }

        Object lookupValue(ReadableCollection resolver) {
            ReadableCollection collection = resolver;
            Object key;
            for (int i = 0; collection != null && i < path.length - 1; i++) {
                key = path[i];
                collection = collection.has(key) ? collection.value(key, ReadableCollection.class) : null;
            }

            if (collection != null) {
                key = path[path.length - 1];
                return collection.value(key);
            }

            return null;
        }

/*
        static ReanimatedCollection buildMap(List<ArgMap> mapping, NodesManager nodesManager) {
            return buildMap(mapping, nodesManager, ReanimatedCollection.class);
        }


 */
/*
        private static ReanimatedCollection buildMap(List<ArgMap> mapping, NodesManager nodesManager) {
            int depth = 0;
            ArrayList<String> path;
            List<String> current;
            List<String> prev;
            String key;
            ReanimatedCollection collection;
            ReanimatedCollection map = new ReanimatedCollection();
            HashMap<List<String>, ReanimatedCollection> stack = new HashMap<>();

            for (int i = 0; i < mapping.size(); i++) {
                depth = Math.max(depth, mapping.get(i).path.length);
            }
            for (int i = 0; i <= depth; i++) {
                for (ArgMap argMap: mapping) {
                    path = argMap.getPath();

                    if (i < path.size()) {
                        key = path.get(i);

                        //  assign
                        if (i == 0) {
                            collection = map;
                            collection.putDynamic(key, new HashMap<>());
                            current = path.subList(0, i + 1);
                            stack.put(current, collection);
                        } else {
                            prev = path.subList(0, i);
                            current = path.subList(0, i + 1);
                            collection = stack.get(prev);
                            Log.d("Invoke", "buildMap: current " + prev + "  " + collection);
                            if (i == path.size() - 1) {
                                collection.putDynamic(key, nodesManager.getNodeValue(argMap.nodeID));
                            } else {
                                collection.putDynamic(key, new HashMap<>());
                                stack.put(current, collection);
                                stack.remove(prev);
                            }

                        }

                        //  put in stack
                        //current = path.subList(0, i);
                        Log.d("Invoke", "buildMap: current " + current + "  " + collection);

                    }
                }
            }

            return map;
        }



 */
        @NonNull
        @Override
        public String toString() {
            ArrayList<Object> list = new ArrayList<>();
            for (int i = 0; i < path.length; i++) {
                list.add(i, path[i]);
            }
            list.add(String.valueOf(nodeID));
            return list.toString();
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
    private Boolean mDirty = true;
    private ReanimatedMapBuilder mBuilder;
    private Object mValue;
    private SparseArray<Object> mMemoizedValues = new SparseArray<>();

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

    void setValue(@Nullable ReadableArray data) {
        setValue(((ReadableCollection) ReanimatedNativeArray.fromArray(data)));
    }

    void setValue(@Nullable ReadableMap data) {
        setValue(((ReadableCollection) ReanimatedNativeMap.fromMap(data)));
    }

    private void setValue(@Nullable ReadableCollection data) {
        if (data == null) {
            throw new IllegalArgumentException("Animated maps must have map data.");
        }

        Node node;
        ArgMap map;
        Object value;

        for (int i = 0; i < mMapping.size(); i++) {
            map = mMapping.get(i);

            if (map.path.length == 0) {
                //  a case in which the proxy is an effect proxy,
                //  e.g { nativeEvent: () => set(run, 1) }
                node = mNodesManager.findNodeById(map.nodeID, Node.class);
                node.value();
            } else {
                value = map.lookupValue(data);
                if (value != null) {
                    node = mNodesManager.findNodeById(map.nodeID, Node.class);
                    ((ValueManagingNode) node).setValue(value);

                    if (!value.equals(mMemoizedValues.get(map.nodeID))) {
                        mDirty = true;
                        mMemoizedValues.put(map.nodeID, value);
                    }
                }
            }
        }
    }

    private Boolean isDirty() {
        if (mDirty) {
            return true;
        }

        for (int i = 0; i < mMapping.size(); i++) {
            ArgMap map = mMapping.get(i);
            Object memoizedNodeValue = map.lookupValue(mBuilder);
            Object nodeValue = mNodesManager.getNodeValue(map.nodeID);
            if (!nodeValue.equals(memoizedNodeValue)) {
                return true;
            }
        }

        mDirty = false;
        return false;
    }

    @Nullable
    @Override
    protected Object evaluate() {
        //  `buildMap` is extremely expensive, therefore we check if node is dirty
        if (isDirty()) {
            mDirty = false;
            mBuilder = ReanimatedMapBuilder.fromMapping(mMapping, mNodesManager, true);
            mValue = mBuilder.export();
        }
        return mValue;
    }

    @Nullable
    @Override
    public Object finalValue() {
        return ReanimatedMapBuilder.fromMapping(mMapping, mNodesManager, true);
        //ReanimatedNativeCollection.fromMapping(mMapping, mNodesManager);
        //return WritableNa(mMapping, mNodesManager).export();
    }
}
