package com.swmansion.reanimated.bridging;

import android.util.SparseArray;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.nodes.MapNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class ReanimatedMapBuilder<A extends ReanimatedBridge.ReanimatedArray, M extends ReanimatedBridge.ReanimatedMap, AB extends Class<A>, MB extends Class<M>> implements ReanimatedBridge.ReadableCollection {
    private final AB arrayBuilder;
    private final MB mapBuilder;
    private final SparseArray<Object> arrayContext;
    private M mapContext;
    private final ReadableArrayResolver arrayResolver;
    private final ReadableMapResolver mapResolver;
    private ReadableType type = ReadableType.Null;

    public static ReanimatedMapBuilder create(boolean useNativeBuilder) throws InstantiationException, IllegalAccessException {
        if (useNativeBuilder) {
            return new ReanimatedMapBuilder(ReanimatedWritableNativeMap.class, ReanimatedWritableNativeArray.class);
        } else {
            return new ReanimatedMapBuilder(ReanimatedWritableMap.class, ReanimatedWritableArray.class);
        }
    }

    ReanimatedMapBuilder(MB mapBuilder, AB arrayBuilder) throws InstantiationException, IllegalAccessException {
        this.arrayBuilder = arrayBuilder;
        this.mapBuilder = mapBuilder;
        arrayContext = new SparseArray<>();
        mapContext = this.mapBuilder.newInstance();
        arrayResolver = new ReadableArrayResolver(new ReadableArrayResolver.Resolvable() {
            @Override
            public int size() {
                return arrayContext.size();
            }

            @Override
            public Object resolve(int index) {
                return arrayContext.valueAt(index);
            }
        });
        mapResolver = new ReadableMapResolver(mapContext);
    }

    private ReanimatedBridge.ReadableCollection resolver(Object key) {
        return ReadableArrayResolver.isIndex(key) ? arrayResolver : mapResolver;
    }

    @Override
    public Object source() {
        //  noop
        return null;
    }

    @Override
    public boolean has(Object key) {
        return resolver(key).has(key);
    }

    @Nullable
    @Override
    public Object value(Object key) {
        return resolver(key).value(key);
    }

    @Override
    public <T> T value(Object key, Class<T> type) {
        return resolver(key).value(key, type);
    }

    public void putDynamic(Object key, Object o) {
        if (ReadableArrayResolver.isIndex(key)) {
            assertIsNotType(ReadableType.Map, key);
            type = ReadableType.Array;
            arrayContext.put(arrayResolver.resolveIndex(key), o);
        } else {
            assertIsNotType(ReadableType.Array, key);
            type = ReadableType.Map;
            mapContext.putDynamic((String) key, o);
        }
    }

    public void merge(ReanimatedMapBuilder source) {
        mapContext.merge(source.mapContext);
        //noinspection unchecked
        SparseArray<Object> sourceArray = source.arrayContext;
        assertCondition(
                type != source.type && type != ReadableType.Null,
                String.format("Illegal merge operation: (%s) %s trying to merge (%s) %s", type, this, source.type, source)
        );
        type = source.type;
        for (int i = 0; i < sourceArray.size(); i++) {
            assertIsNotType(ReadableType.Map, i);
            arrayContext.append(sourceArray.keyAt(i), sourceArray.valueAt(i));
        }
    }

    @NonNull
    public ReanimatedMapBuilder copy() throws InstantiationException, IllegalAccessException {
        //noinspection unchecked,unchecked
        ReanimatedMapBuilder copy = new ReanimatedMapBuilder(mapBuilder, arrayBuilder);
        copy.merge(this);
        copy.type = type;
        return copy;
    }

    public ReadableType getType() {
        return type;
    }

    boolean isArray() {
        return type == ReadableType.Array;
    }

    private void assertIsNotType(ReadableType type, Object key) {
        assertCondition(
                this.type == type,
                String.format(
                        "Ambiguous collection type: map context %s, array context %s, next key %s, current type %s",
                        mapContext, arrayContext, key, type
                )
        );
    }

    private void assertCondition(boolean condition, String message) {
        if (condition) {
            throw new JSApplicationCausedNativeException(message);
        }
    }

    @NonNull
    public A asArray(boolean useNativeBuilder) {
        A array;
        Object value;
        try {
            array = arrayBuilder.newInstance();
            for (int i = 0; i < arrayContext.size(); i++) {
                value = arrayContext.valueAt(i);
                array.pushDynamic(useNativeBuilder ? ReflectionUtils.nativeCloneDeep(value) : value);
            }
        } catch (Throwable e) {
            e.printStackTrace();
            throw new JSApplicationCausedNativeException("ReanimatedMapBuilder error", e);
        } 
        
        return array;
    }

    @SuppressWarnings("unchecked")
    @NonNull
    public M asMap(boolean useNativeBuilder) {
        return ((M) (useNativeBuilder ? ReanimatedWritableNativeMap.fromMap(mapContext) : mapContext));
    }

    @NonNull
    public Object export() {
        return export(true);
    }

    @NonNull
    public Object export(boolean useNativeBuilder) {
        return isArray() ? asArray(useNativeBuilder) : asMap(useNativeBuilder);
    }

    @NonNull
    @Override
    public String toString() {
        return export(false).toString();
    }

    public static Object exportValue(Object value) {
        if (value instanceof ReadableMap) {
            return ReanimatedWritableNativeMap.fromMap((ReadableMap) value);
        } else if (value instanceof ReadableArray) {
            return ReanimatedWritableNativeArray.fromArray((ReadableArray) value);
        } else {
            return value;
        }
    }

    public static class ReanimatedMapBuilderManager {

        private final ReanimatedMapBuilder mMapBuilder;

        public ReanimatedMapBuilderManager(ReanimatedMapBuilder mapBuilder) {
            mMapBuilder = mapBuilder;
        }

        // TODO: 08/12/2019  setting value at path doesn't propagate to collection
        public void set(ArrayList<Object> path, Object value) {
            ReanimatedBridge.ReadableCollection collection = mMapBuilder;
            Object key;
            for (int i = 0; collection != null && i < path.size() - 1; i++) {
                key = path.get(i);
                collection = collection.has(key) ? collection.value(key, ReanimatedBridge.ReadableCollection.class) : null;
            }

            if (collection != null) {
                key = path.get(path.size() - 1);
                Object source = mMapBuilder.resolver(key).source();
                if (source instanceof ReanimatedWritableMap) {
                    ((ReanimatedWritableMap) source).put((String) key, value);
                } else if (source instanceof ReanimatedWritableArray) {
                    ((ReanimatedWritableArray) source).set((int) key, value);
                } else {
                    throw new JSApplicationCausedNativeException(
                            String.format("It is impossible to set values for %s", collection.getClass().getSimpleName())
                    );
                }
            }
        }
    }

    public static ReanimatedMapBuilder fromMapping(List<MapNode.ArgMap> mapping, NodesManager nodesManager, boolean useNativeBuilder) {
        try {
            return buildMap(mapping, nodesManager, useNativeBuilder);
        } catch (Throwable e) {
            throw new JSApplicationCausedNativeException(String.format("%s error", ReanimatedMapBuilder.class.getSimpleName()), e);
        }
    }

    private static <T extends ReanimatedMapBuilder> T buildMap(List<MapNode.ArgMap> mapping, NodesManager nodesManager, boolean useNativeBuilder) throws InstantiationException, IllegalAccessException {
        int depth = 0;
        ArrayList<Object> path;
        List<Object> next;
        List<Object> current;
        Object key;
        ReanimatedMapBuilder collection;
        ReanimatedMapBuilder map = ReanimatedMapBuilder.create(useNativeBuilder);
        HashMap<List<Object>, ReanimatedMapBuilder> stack = new HashMap<>();

        for (int i = 0; i < mapping.size(); i++) {
            depth = Math.max(depth, mapping.get(i).getPath().size());
        }
        for (int i = depth; i >= 0; i--) {
            for (MapNode.ArgMap argMap: mapping) {
                path = argMap.getPath();

                if (i < path.size()) {
                    key = path.get(i);
                    collection = ReanimatedMapBuilder.create(useNativeBuilder);

                    //  assign
                    if(i == path.size() - 1) {
                        collection.putDynamic(key, nodesManager.getNodeValue(argMap.nodeID));
                    } else {
                        current = path.subList(0, i);
                        collection.putDynamic(key, stack.get(current).export(useNativeBuilder));
                    }

                    //  merge
                    if (i == 0) {
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

}
