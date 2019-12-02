package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableNativeMap;


@SuppressWarnings("UnusedReturnValue")
public class ReanimatedWritableMap extends WritableNativeMap implements WritableCollection {

    public static ReanimatedWritableMap fromMap(ReadableMap source) {
        if (source instanceof ReanimatedWritableMap) {
            return ((ReanimatedWritableMap) source);
        } else {
            ReanimatedWritableMap out = new ReanimatedWritableMap();
            out.merge(source);
            return out;
        }
    }

    public static ReanimatedWritableMap fromArray(ReadableArray source) {
        ReanimatedWritableMap out = new ReanimatedWritableMap();
        WritableMapUtils.addAll(out, source);
        return out;
    }

    @Override
    public Boolean has(Object key) {
        return hasKey(WritableMapUtils.resolveKey(key));
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

    @Override
    public ReanimatedWritableMap copy() {
        ReanimatedWritableMap copy = new ReanimatedWritableMap();
        copy.merge(((ReadableMap) this));
        return copy;
    }

    @Nullable
    @Override
    public ReadableArray getArray(@NonNull String name) {
        return ReanimatedWritableArray.fromArray(super.getArray(name));
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

    public void putDynamic(String key, Object o) {
        WritableMapUtils.putVariant(this, key, o);
    }

    @Nullable
    @Override
    public ReanimatedWritableMap getMap(@NonNull String name) {
        return getType(name) == ReadableType.Array ?
                fromArray(super.getArray(name)) :
                fromMap(super.getMap(name));
    }

    @Override
    public void merge(@NonNull ReadableCollection source) {
        super.merge(((ReadableMap) source));
    }

    @NonNull
    @Override
    public String toString() {
        return super.copy().toString();
    }

}
