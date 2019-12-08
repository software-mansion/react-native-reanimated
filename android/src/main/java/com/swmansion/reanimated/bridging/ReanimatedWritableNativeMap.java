package com.swmansion.reanimated.bridging;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableNativeMap;

public class ReanimatedWritableNativeMap extends WritableNativeMap implements ReanimatedBridge.ReanimatedMap {

    public static ReanimatedWritableNativeMap fromMap(ReadableMap source) {
        if (source instanceof ReanimatedWritableNativeMap) {
            return ((ReanimatedWritableNativeMap) source);
        } else {
            ReanimatedWritableNativeMap out = new ReanimatedWritableNativeMap();
            if (source instanceof WritableNativeMap) {
                out.merge(source);
            } else {
                out.merge((ReadableMap) ReflectionUtils.nativeCloneDeep(source));
            }

            return out;
        }
    }

    public static ReanimatedWritableNativeMap fromArray(ReadableArray source) {
        ReanimatedWritableNativeMap out = new ReanimatedWritableNativeMap();
        ReadableMapResolver.addAll(out, source);
        return out;
    }

    private final ReadableMapResolver resolver;

    ReanimatedWritableNativeMap() {
        super();
        resolver = new ReadableMapResolver(this);
    }

    @Override
    public Object resolve(String key) {
        return new ReanimatedDynamic(super.getDynamic(key)).value();
    }

    @Override
    public ReadableMapResolver resolver() {
        return resolver;
    }

    @Override
    public ReanimatedWritableNativeMap copy() {
        ReanimatedWritableNativeMap copy = new ReanimatedWritableNativeMap();
        copy.merge(this);
        return copy;
    }

    @Nullable
    @Override
    public ReadableArray getArray(@NonNull String name) {
        return ReanimatedWritableNativeArray.fromArray(super.getArray(name));
    }

    @Override
    public boolean getBoolean(@NonNull String name) {
        return getType(name) == ReadableType.Boolean ?
                super.getBoolean(name) :
                super.getDouble(name) == 1;
    }

    @Override
    public double getDouble(@NonNull String name) {
        return getType(name) == ReadableType.Boolean ?
                ReflectionUtils.toDouble(super.getBoolean(name)) :
                super.getDouble(name);
    }

    @Override
    public void putDynamic(String key, Object o) {
        ReadableMapResolver.putVariant(this, key, o);
    }

    @Nullable
    @Override
    public ReanimatedWritableNativeMap getMap(@NonNull String name) {
        return getType(name) == ReadableType.Array ?
                fromArray(super.getArray(name)) :
                fromMap(super.getMap(name));
    }

    @NonNull
    @Override
    public String toString() {
        return super.copy().toString();
    }

}
