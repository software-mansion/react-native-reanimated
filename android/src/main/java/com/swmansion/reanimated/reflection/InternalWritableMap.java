package com.swmansion.reanimated.reflection;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableMap;
import com.swmansion.reanimated.NodesManager;
import com.swmansion.reanimated.nodes.MapNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;

public class InternalWritableMap extends HashMap<String, Object> implements WritableMap, WritableCollection {

    public static InternalWritableMap fromMap(ReadableMap source) {
        InternalWritableMap map = new InternalWritableMap();
        map.putAll(source.toHashMap());
        return map;
    }

    @Override
    public boolean hasKey(@NonNull String name) {
        return has(name);
    }

    @Override
    public Boolean has(Object key) {
        return containsKey(key);
    }

    @Override
    public <T> T value(Object key, Class<T> type) {
        Object value = value(key);
        if (type.isInstance(value)) {
            return (T) value;
        }
        throw new IllegalArgumentException(
                String.format(
                        "%s: %s is of incompatible type %s, requested type was %s",
                        getClass().getSimpleName(),
                        key,
                        value.getClass(),
                        type
                )
        );
    }

    @Nullable
    @Override
    public Object value(Object key) {
        String name = WritableMapUtils.resolveKey(key);
        return hasKey(name) ? new ReanimatedDynamic(getDynamic(name)).value() : null;
    }

    @Nullable
    @Override
    public InternalWritableArray getArray(@NonNull String name) {
        return InternalWritableArray.fromArray((ReadableArray) super.get(name));
    }

    @Override
    public void putArray(@NonNull String key, @Nullable ReadableArray value) {
        super.put(key, value);
    }

    @Override
    public boolean getBoolean(@NonNull String name) {
        Object value = get(name);
        if (ReflectionUtils.isNumber(value)) {
            value = ReflectionUtils.toDouble(value) == 1;
        }
        return ((boolean) value);
    }

    @Override
    public void putBoolean(@NonNull String key, boolean value) {
        super.put(key, value);
    }

    @Override
    public double getDouble(@NonNull String name) {
        return ReflectionUtils.toDouble(super.get(name));
    }

    @Override
    public void putDouble(@NonNull String key, double value) {
        super.put(key, value);
    }

    @NonNull
    @Override
    public Dynamic getDynamic(@NonNull String name) {
        return new ReanimatedDynamic(this, name);
    }

    public void putDynamic(String key, Dynamic value) {
        WritableMapUtils.putDynamic(this, key, value);
    }

    @Override
    public void putDynamic(String name, Object value) {
        WritableMapUtils.putVariant(this, name, value);
    }

    @Override
    public int getInt(@NonNull String name) {
        return ReflectionUtils.fromDouble(getDouble(name), int.class);
    }

    @Override
    public void putInt(@NonNull String key, int value) {
        super.put(key, value);
    }

    @Nullable
    @Override
    public InternalWritableMap getMap(@NonNull String name) {
        return fromMap(((ReadableMap) super.get(name)));
    }

    @Override
    public void putMap(@NonNull String key, @Nullable ReadableMap value) {
        super.put(key, value);
    }

    @Nullable
    @Override
    public String getString(@NonNull String name) {
        return ((String) super.get(name));
    }

    @Override
    public void putString(@NonNull String key, @Nullable String value) {
        super.put(key, value);
    }

    @NonNull
    @Override
    public ReadableType getType(@NonNull String name) {
        return ReflectionUtils.inferType(super.get(name));
    }

    @Override
    public boolean isNull(@NonNull String name) {
        return super.get(name) == null;
    }

    @Override
    public void putNull(@NonNull String key) {
        super.put(key, null);
    }

    @Override
    public void merge(@NonNull ReadableCollection source) {
        merge((ReadableMap) source);
    }

    @Override
    public void merge(@NonNull ReadableMap source) {
        putAll(source.toHashMap());
    }

    @Override
    public InternalWritableMap copy() {
        return ((InternalWritableMap) clone());
        /*
        InternalWritableMap copy = new InternalWritableMap();
        copy.putAll(this);
        return copy;

         */
    }

    @NonNull
    @Override
    public Iterator<Entry<String, Object>> getEntryIterator() {
        return super.entrySet().iterator();
    }

    @NonNull
    @Override
    public ReadableMapKeySetIterator keySetIterator() {
        return new ReadableMapKeySetIterator() {
            private final Iterator<String> keyIterator = keySet().iterator();
            @Override
            public boolean hasNextKey() {
                return keyIterator.hasNext();
            }

            @Override
            public String nextKey() {
                return keyIterator.next();
            }
        };
    }

    @NonNull
    @Override
    public HashMap<String, Object> toHashMap() {
        return copy();
    }

}
