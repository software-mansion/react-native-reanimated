package com.swmansion.reanimated.reflection;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

import static com.swmansion.reanimated.reflection.ReflectionUtils.isInteger;
import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class ReanimatedWritableMap extends WritableNativeMap {

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
        addAll(out, source);
        return out;
    }

    public @Nullable Object value(String name) {
        return hasKey(name) ? new ReanimatedDynamic(getDynamic(name)).value() : null;
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
                toDouble(super.getBoolean(name)) :
                super.getDouble(name);
    }

    public void putDynamic(String key, Object o) {
        putVariant(this, key, o);
    }

    @Nullable
    @Override
    public ReanimatedWritableMap getMap(@NonNull String name) {
        Log.d("Invoke", "getMap: from array " + (getType(name) == ReadableType.Array ? fromArray(super.getArray(name)) : ""));
        return getType(name) == ReadableType.Array ?
                fromArray(super.getArray(name)) :
                fromMap(super.getMap(name));
    }

    @Override
    public String toString() {
        return super.copy().toString();
    }

    private static WritableMap putVariant(WritableMap map, String key, Object o){
        if (o instanceof Dynamic) {
            putDynamic(map, key, ((Dynamic) o));
        } else {
            switch(ReflectionUtils.inferType(o)){
                case Array:
                    map.putArray(key, ((WritableArray) o));
                    break;
                case Map:
                    map.putMap(key, ((WritableMap) o));
                    break;
                case Null:
                    map.putNull(key);
                    break;
                case Number:
                    if (isInteger(o)){
                        map.putInt(key, ((Integer) o));
                    } else {
                        map.putDouble(key, toDouble(o));
                    }
                    break;
                case String:
                    map.putString(key, ((String) o));
                    break;
                case Boolean:
                    map.putBoolean(key, ((Boolean) o));
                    break;
            }
        }

        return map;
    }

    private static WritableMap putDynamic(WritableMap map, String key, Dynamic o){
        switch(o.getType()){
            case Array:
                map.putArray(key, o.asArray());
                break;
            case Map:
                map.putMap(key, o.asMap());
                break;
            case Null:
                map.putNull(key);
                break;
            case Number:
                map.putDouble(key, o.asDouble());
                break;
            case String:
                map.putString(key, o.asString());
                break;
            case Boolean:
                map.putBoolean(key, o.asBoolean());
                break;
        }

        return map;
    }

    private static WritableMap addAll(WritableMap to, ReadableArray from) {
        Dynamic dynamic;
        for (int i = 0; i < from.size(); i++) {
            dynamic =  from.getDynamic(i);
            putDynamic(to, String.valueOf(i), dynamic);
            dynamic.recycle();
        }

        return to;
    }
}
