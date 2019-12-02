package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableMap;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class ReanimatedMap extends HashMap<String, Object> implements WritableMap, ReadableCollection {

    public static ReanimatedMap fromMap(ReadableMap source) {
        ReanimatedMap map = new ReanimatedMap();
        map.putAll(source.toHashMap());
        return map;
    }

    protected WritableMapResolver resolver;

    ReanimatedMap() {
        super();
        resolver = new WritableMapResolver(this);
    }

    @Override
    public boolean has(Object key) {
        return resolver.has(key);
    }

    @Nullable
    @Override
    public Object value(Object key) {
        return resolver.value(key);
    }

    @Override
    public <T> T value(Object key, Class<T> type) {
        return resolver.value(key, type);
    }

    @Override
    public boolean hasKey(@NonNull String name) {
        return containsKey(name);
    }

    @Nullable
    @Override
    public ReanimatedArray getArray(@NonNull String name) {
        return ReanimatedArray.fromArray((ReadableArray) super.get(name));
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
        return new ReanimatedDynamic(resolver, name);
    }

    public void putDynamic(String key, Dynamic value) {
        resolver.putVariant(key, value);
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
    public ReanimatedMap getMap(@NonNull String name) {
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
    public void merge(@NonNull ReadableMap source) {
        putAll((HashMap<String, Object>) source.toHashMap().clone());
    }

    @Override
    public ReanimatedMap copy() {
        return ((ReanimatedMap) clone());
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
