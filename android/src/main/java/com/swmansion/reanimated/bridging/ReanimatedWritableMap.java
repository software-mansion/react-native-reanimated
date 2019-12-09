package com.swmansion.reanimated.bridging;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;

import java.util.HashMap;
import java.util.Iterator;

public class ReanimatedWritableMap extends HashMap<String, Object> implements ReanimatedBridge.ReanimatedMap {

    public static ReanimatedWritableMap fromMap(ReadableMap source) {
        ReanimatedWritableMap map = new ReanimatedWritableMap();
        map.putAll(source.toHashMap());
        return map;
    }

    private final ReadableMapResolver resolver;

    ReanimatedWritableMap() {
        super();
        resolver = new ReadableMapResolver(this);
    }

    @Override
    public boolean hasKey(@NonNull String name) {
        return containsKey(name);
    }

    @Override
    public Object resolve(String key) {
        return super.get(key);
    }

    @Override
    public ReadableMapResolver resolver() {
        return resolver;
    }

    @Nullable
    @Override
    public ReanimatedWritableArray getArray(@NonNull String name) {
        return ReanimatedWritableArray.fromArray((ReadableArray) super.get(name));
    }

    @Override
    public void putArray(@NonNull String key, @Nullable ReadableArray value) {
        super.put(key, value);
    }

    @Override
    public boolean getBoolean(@NonNull String name) {
        Object value = get(name);
        if (BridgingUtils.isNumber(value)) {
            value = BridgingUtils.toDouble(value) == 1;
        }
        return ((boolean) value);
    }

    @Override
    public void putBoolean(@NonNull String key, boolean value) {
        super.put(key, value);
    }

    @Override
    public double getDouble(@NonNull String name) {
        return BridgingUtils.toDouble(super.get(name));
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

    @Override
    public void putDynamic(String key, Object value) {
        ReadableMapResolver.putVariant(this, key, value);
    }

    @Override
    public int getInt(@NonNull String name) {
        return BridgingUtils.fromDouble(getDouble(name), int.class);
    }

    @Override
    public void putInt(@NonNull String key, int value) {
        super.put(key, value);
    }

    @Nullable
    @Override
    public ReanimatedWritableMap getMap(@NonNull String name) {
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
        return BridgingUtils.inferType(super.get(name));
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
    public ReanimatedWritableMap copy() {
        return ((ReanimatedWritableMap) clone());
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
