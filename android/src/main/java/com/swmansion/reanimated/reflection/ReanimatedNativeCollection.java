package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.nodes.MapNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class ReanimatedNativeCollection implements WritableCollection {

    public static ReanimatedNativeCollection fromMap(ReadableMap source) {
        if (source instanceof ReanimatedNativeCollection) {
            return ((ReanimatedNativeCollection) source);
        } else {
            ReanimatedNativeCollection out = new ReanimatedNativeCollection();
            out.merge(source);
            return out;
        }
    }
    
    private final WritableCollectionResolver mResolver;
    private ReanimatedNativeMap map;

    public ReanimatedNativeCollection() {
        super();
        mResolver = new WritableCollectionResolver(this);
        map = new ReanimatedNativeMap();
    }

    @Override
    public ReadableCollection resolver() {
        return map.resolver;
    }

    @NonNull
    @Override
    public ReanimatedNativeMap getMap() {
        return map;
    }

    @Override
    public void putDynamic(String key, Object o) {
        map.putDynamic(mResolver.resolveKey(key), o);
    }

    @Override
    public ReadableType getType() {
        return mResolver.getType();
    }

    @Override
    public void merge(WritableCollection source) {
        map.merge(source.getMap());
    }

    @Override
    public void merge(ReadableMap source) {
        map.merge(source);
    }

    @Override
    public ReanimatedNativeCollection copy() {
        ReanimatedNativeCollection copy = new ReanimatedNativeCollection();
        copy.merge(this);
        return copy;
    }

    @Override
    public WritableArray asArray() {
        ReanimatedNativeArray array = new ReanimatedNativeArray();
        for (Object value: mResolver.toArrayList()) {
            array.pushDynamic(value);
        }
        return array;
    }

    @Override
    public WritableMap asMap() {
        return map;
    }

    @Override
    public Object export() {
        return mResolver.isArray() ? asArray() : asMap();
    }

    @NonNull
    @Override
    public String toString() {
        return mResolver.isArray() ? mResolver.toArrayList().toString() : super.toString();
    }

    public static WritableCollection fromMapping(List<MapNode.ArgMap> mapping, NodesManager nodesManager) {
        try {
            return fromMapping(mapping, nodesManager, ReanimatedNativeCollection.class);
        } catch (InstantiationException e) {
            throw new JSApplicationCausedNativeException("Reanimated map builder error", e);
        } catch (IllegalAccessException e) {
            throw new JSApplicationCausedNativeException("Reanimated map builder error", e);
        }
    }

    private static <T extends WritableCollection, R extends WritableMap> T fromMapping(List<MapNode.ArgMap> mapping, NodesManager nodesManager, Class<T> builder) throws InstantiationException, IllegalAccessException {
        int depth = 0;
        ArrayList<String> path;
        List<String> next;
        List<String> current;
        String key;
        WritableCollection collection;
        WritableCollection map = builder.newInstance();
        HashMap<List<String>, WritableCollection> stack = new HashMap<>();

        for (int i = 0; i < mapping.size(); i++) {
            depth = Math.max(depth, mapping.get(i).getPath().size());
        }
        for (int i = depth; i >= 0; i--) {
            for (MapNode.ArgMap argMap: mapping) {
                path = argMap.getPath();

                if (i < path.size()) {
                    key = path.get(i);
                    collection = builder.newInstance();

                    //  assign
                    if(i == path.size() - 1) {
                        collection.putDynamic(key, nodesManager.getNodeValue(argMap.nodeID));
                    } else {
                        current = path.subList(0, i);
                        collection.putDynamic(key, stack.get(current).getMap().copy());
                    }

                    //  merge
                    if (i == 0) {
                        //Log.d("Invoke", "merge end: " + collection);
                        map.merge(collection);
                    } else {
                        next = path.subList(0, i - 1);
                        if (stack.containsKey(next)) {
                            collection.merge(stack.get(next));
                        }
                        stack.put(next, collection);
                    }

                }
            }
        }

        return ((T) map);
    }


    public static ReanimatedNativeCollection fromMapping111(List<MapNode.ArgMap> mapping, NodesManager nodesManager) {
        int depth = 0;
        ArrayList<String> path;
        List<String> next;
        List<String> current;
        String key;
        ReanimatedNativeCollection collection;
        ReanimatedNativeCollection map = new ReanimatedNativeCollection();
        HashMap<List<String>, ReanimatedNativeCollection> stack = new HashMap<>();

        for (int i = 0; i < mapping.size(); i++) {
            depth = Math.max(depth, mapping.get(i).getPath().size());
        }
        for (int i = depth; i >= 0; i--) {
            for (MapNode.ArgMap argMap: mapping) {
                path = argMap.getPath();

                if (i < path.size()) {
                    key = path.get(i);
                    collection = new ReanimatedNativeCollection();

                    //  assign
                    if(i == path.size() - 1) {
                        collection.putDynamic(key, nodesManager.getNodeValue(argMap.nodeID));
                    } else {
                        current = path.subList(0, i);
                        collection.putDynamic(key, stack.get(current).copy());
                    }

                    //  merge
                    if (i == 0) {
                        //Log.d("Invoke", "merge end: " + collection);
                        map.merge(collection);
                    } else {
                        next = path.subList(0, i - 1);
                        if (stack.containsKey(next)) {
                            collection.merge(stack.get(next));
                        }
                        stack.put(next, collection);
                    }

                }
            }
        }

        return map;
    }

}
