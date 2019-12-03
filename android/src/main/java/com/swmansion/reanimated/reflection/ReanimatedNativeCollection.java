package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;

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

public class ReanimatedNativeCollection extends ReanimatedNativeMap implements WritableCollection {

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

    ReanimatedNativeCollection() {
        super();
        mResolver = new WritableCollectionResolver(this);
    }

    @Override
    public ReadableCollection resolver() {
        return resolver;
    }

    @Override
    public void putDynamic(String key, Object o) {
        super.putDynamic(mResolver.resolveKey(key), o);
    }

    @Override
    public ReadableType getType() {
        return mResolver.getType();
    }

    @Override
    public ReanimatedNativeCollection copy() {
        ReanimatedNativeCollection copy = new ReanimatedNativeCollection();
        copy.merge(this);
        return copy;
    }

    @NonNull
    public ArrayList<Object> toArrayList() {
        ArrayList<Object> list = new ArrayList<>();
        ReadableMapKeySetIterator keySetIterator = keySetIterator();
        String key;
        int index;

        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            if (WritableArrayResolver.isIndex(key)) {
                index = Integer.valueOf(key);
                list.ensureCapacity(index + 1);
                while (list.size() <= index) {
                    list.add(null);
                }
                list.set(index, new ReanimatedDynamic(getDynamic(key)).value());
            }
        }

        return list;
    }

    @Override
    public WritableArray asArray() {
        ReanimatedNativeArray array = new ReanimatedNativeArray();
        for (Object value: toArrayList()) {
            array.pushDynamic(value);
        }
        return array;
    }

    @Override
    public WritableMap asMap() {
        return this;
    }

    @Override
    public Object export() {
        return mResolver.isArray() ? asArray() : asMap();
    }

    @NonNull
    @Override
    public String toString() {
        return mResolver.isArray() ? toArrayList().toString() : super.toString();
    }

    public static ReanimatedNativeCollection fromMapping(List<MapNode.ArgMap> mapping, NodesManager nodesManager) {
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
