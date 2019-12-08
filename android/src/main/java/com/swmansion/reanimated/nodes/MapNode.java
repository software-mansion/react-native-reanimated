package com.swmansion.reanimated.nodes;

import android.util.SparseArray;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.bridging.ReadableArrayResolver;
import com.swmansion.reanimated.bridging.ReadableMapResolver;
import com.swmansion.reanimated.bridging.ReanimatedBridge;
import com.swmansion.reanimated.bridging.ReanimatedMapBuilder;

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

        Object lookupValue(ReanimatedBridge.ReadableCollection resolver) {
            ReanimatedBridge.ReadableCollection collection = resolver;
            Object key;
            for (int i = 0; collection != null && i < path.length - 1; i++) {
                key = path[i];
                collection = collection.has(key) ? collection.value(key, ReanimatedBridge.ReadableCollection.class) : null;
            }

            if (collection != null) {
                key = path[path.length - 1];
                return collection.value(key);
            }

            return null;
        }

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
    private ReanimatedMapBuilder.ReanimatedMapBuilderManager mBuilderManager;
    private final boolean useNativeBuilder = false;
    private SparseArray<Object> mMemoizedValues = new SparseArray<>();

    public MapNode(int nodeID, ReadableMap config, NodesManager nodesManager) {
        super(nodeID, config, nodesManager);
        mMapping = processMapping(config.getArray("argMapping"));
    }

    private void initMapBuilder() {
        if (mBuilder == null) {
            mBuilder = ReanimatedMapBuilder.fromMapping(mMapping, mNodesManager, useNativeBuilder);
            mBuilderManager = new ReanimatedMapBuilder.ReanimatedMapBuilderManager(mBuilder);
        }
    }

    public void setValue(int nodeID) {
        MapNode newMapNode = mNodesManager.findNodeById(nodeID, MapNode.class);
        mMapping = newMapNode.mMapping;
    }

    @Override
    public void setValue(Object value) {
        if (value instanceof ReadableArray) {
            setValue((ReadableArray) value);
        } else if (value instanceof ReadableMap) {
            setValue((ReadableMap) value);
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
        setValue(ReadableArrayResolver.obtain(data));
    }

    void setValue(@Nullable ReadableMap data) {
        setValue(ReadableMapResolver.obtain(data));
    }

    private void setValue(@Nullable ReanimatedBridge.ReadableCollection data) {
        if (data == null) {
            throw new JSApplicationIllegalArgumentException("Animated maps must have map data.");
        }

        Node node;
        ArgMap map;
        Object value;

        if (!useNativeBuilder) {
            // TODO: 08/12/2019 uncomment once set is working 
            //initMapBuilder();
        }

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
                        if (!useNativeBuilder) {
                            // TODO: 08/12/2019 uncomment once set is working 
                            //mBuilderManager.set(map.getPath(), value);
                        }
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
        /*
        // TODO: 08/12/2019 once ReanimatedMapBuilder set method will work use this and uncomment the rest
        if (isDirty() && useNativeBuilder) {
            mDirty = false;
            mBuilder = ReanimatedMapBuilder.fromMapping(mMapping, mNodesManager, true);
        } else {
            initMapBuilder();
        }

         */
        
        //  defaulting // TODO: 08/12/2019 remove  
        mBuilder = ReanimatedMapBuilder.fromMapping(mMapping, mNodesManager, useNativeBuilder);

        return mBuilder.export(useNativeBuilder);
    }

    @Override
    public Object exportableValue() {
        return ReanimatedMapBuilder.exportValue(value());
    }
}
