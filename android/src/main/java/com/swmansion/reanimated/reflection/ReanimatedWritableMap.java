package com.swmansion.reanimated.reflection;

import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import static com.swmansion.reanimated.reflection.ReflectionUtils.isInteger;
import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class ReanimatedWritableMap extends WritableNativeMap implements WritableArray {
    private WritableNativeArray source = new WritableNativeArray();

    public static ReanimatedWritableMap fromArray(Object[] array){
        ReanimatedWritableMap out = new ReanimatedWritableMap();
        for (int i = 0; i < array.length; i++) {
            out.pushDynamic(array[i]);
        }
        return out;
    }

    public static ReanimatedWritableMap fromArray(ReadableArray array) {
        if (array instanceof ReanimatedWritableMap) {
            return ((ReanimatedWritableMap) array);
        } else {
            ReanimatedWritableMap out = new ReanimatedWritableMap();
            for (Object value: array.toArrayList()) {
                out.pushDynamic(value);
            }
            return out;
        }
    }

    public static ReanimatedWritableMap fromMap(ReadableMap source) {
        if (source instanceof ReanimatedWritableMap) {
            return ((ReanimatedWritableMap) source);
        } else {
            ReanimatedWritableMap out = new ReanimatedWritableMap();
            out.merge(source);
            return out;
        }
    }

    public ReanimatedWritableMap value() {
        addAll(((WritableMap) this), source);
        return this;
    }

    public Object value(String name) {
        ReanimatedDynamic val = null;
        if (super.hasKey(name)) {
            val = getDynamic(name);
        } else if (TextUtils.isDigitsOnly(name)){
            int index = Integer.valueOf(name);
            val = getDynamic(index);
        }

        if (val == null) {
            return null;
        } else {
            Object result = val.value();
            val.recycle();
            return result;
        }
    }

    @Nullable
    @Override
    public ReanimatedWritableMap getArray(@NonNull String name) {
        return fromArray(super.getArray(name));
    }

    @Nullable
    @Override
    public ReanimatedWritableMap getArray(int index) {
        return fromArray(source.getArray(index));
    }

    @Override
    public void pushArray(@Nullable ReadableArray array) {
        source.pushArray(array);
    }

    @Override
    public boolean getBoolean(@NonNull String name) {
        return getType(name) == ReadableType.Boolean ?
                super.getBoolean(name) :
                super.getDouble(name) == 1;
    }

    @Override
    public boolean getBoolean(int index) {
        return source.getType(index) == ReadableType.Boolean ?
                source.getBoolean(index) :
                source.getDouble(index) == 1;
    }

    @Override
    public void pushBoolean(boolean value) {
        source.pushBoolean(value);
    }

    @Override
    public double getDouble(@NonNull String name) {
        return getType(name) == ReadableType.Boolean ?
                toDouble(super.getBoolean(name)) :
                super.getDouble(name);
    }

    @Override
    public double getDouble(int index) {
        return source.getType(index) == ReadableType.Boolean ?
                toDouble(source.getBoolean(index)) :
                source.getDouble(index);
    }

    @Override
    public void pushDouble(double value) {
        source.pushDouble(value);
    }

    @NonNull
    @Override
    public ReanimatedDynamic getDynamic(@NonNull String name) {
        return new ReanimatedDynamic(super.getDynamic(name));
    }

    @NonNull
    @Override
    public ReanimatedDynamic getDynamic(int index) {
        return new ReanimatedDynamic(source.getDynamic(index));
    }

    public void putDynamic(String key, Object o) {
        putVariant(this, key, o);
    }

    public void pushDynamic(Object o) {
        pushVariant(source, o);
    }

    @Override
    public int getInt(int index) {
        return source.getInt(index);
    }

    @Override
    public void pushInt(int value) {
        source.pushInt(value);
    }

    @Nullable
    @Override
    public ReanimatedWritableMap getMap(@NonNull String name) {
        return super.getType(name) == ReadableType.Array ?
                getArray(name) :
                fromMap(super.getMap(name));
    }

    @Nullable
    @Override
    public ReanimatedWritableMap getMap(int index) {
        return getType(index) == ReadableType.Array ?
                getArray(index) :
                getMap(index);
    }

    @Override
    public void pushMap(@Nullable ReadableMap map) {
        source.pushMap(map);
    }

    @Override
    public boolean hasKey(@NonNull String name) {
        return super.hasKey(name) || (TextUtils.isDigitsOnly(name) && source.size() > Integer.valueOf(name));
    }

    @Nullable
    @Override
    public String getString(int index) {
        return source.getString(index);
    }

    @Override
    public void pushString(@Nullable String value) {
        source.pushString(value);
    }

    @NonNull
    @Override
    public ReadableType getType(int index) {
        return source.getType(index);
    }

    @Override
    public boolean isNull(int index) {
        return source.isNull(index);
    }

    @Override
    public void pushNull() {
        source.pushNull();
    }

    @NonNull
    @Override
    public ArrayList<Object> toArrayList() {
        return source.toArrayList();
    }

    @NonNull
    @Override
    public HashMap<String, Object> toHashMap() {
        WritableMap out = new WritableNativeMap();
        out.merge(this);
        addAll(out, source);
        return out.toHashMap();
    }

    @NonNull
    @Override
    public ReadableMapKeySetIterator keySetIterator() {
        return new ReadableMapKeySetIterator() {
            private final Iterator<String> mIterator = toHashMap().keySet().iterator();

            @Override
            public boolean hasNextKey() {
                return mIterator.hasNext();
            }

            @Override
            public String nextKey() {
                return mIterator.next();
            }
        };
    }

    @NonNull
    @Override
    public Iterator<Map.Entry<String, Object>> getEntryIterator() {
        return toHashMap().entrySet().iterator();
    }

    @Override
    public int size() {
        return source.size();
    }

    public void merge(@NonNull ReanimatedWritableMap source) {
        super.merge(source);
        addAll(this.source, source.source);
    }

    @Override
    public ReanimatedWritableMap copy() {
        ReanimatedWritableMap out = new ReanimatedWritableMap();
        out.merge(super.copy());
        addAll(out.source, source);
        return out;
    }

    @Override
    @NonNull
    public String toString() {
        return source.size() > 0 ?
                copy().source.toString() :
                super.copy().toString();
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

    private static WritableArray pushVariant(WritableArray arr, Object o) {
        if (o instanceof Dynamic) {
            pushDynamic(arr, ((Dynamic) o));
        } else {
            switch(ReflectionUtils.inferType(o)){
                case Array:
                    arr.pushArray(((WritableArray) o));
                    break;
                case Map:
                    arr.pushMap(((WritableMap) o));
                    break;
                case Null:
                    arr.pushNull();
                    break;
                case Number:
                    if (isInteger(o)){
                        arr.pushInt((Integer) o);
                    } else {
                        arr.pushDouble(toDouble(o));
                    }
                    break;
                case String:
                    arr.pushString(((String) o));
                    break;
                case Boolean:
                    arr.pushBoolean(((Boolean) o));
                    break;
            }
        }

        return arr;
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

    private static WritableArray pushDynamic(WritableArray arr, Dynamic o){
        switch(o.getType()){
            case Array:
                arr.pushArray(o.asArray());
                break;
            case Map:
                arr.pushMap(o.asMap());
                break;
            case Null:
                arr.pushNull();
                break;
            case Number:
                arr.pushDouble(o.asDouble());
                break;
            case String:
                arr.pushString(o.asString());
                break;
            case Boolean:
                arr.pushBoolean(o.asBoolean());
                break;
        }

        return arr;
    }

    private static ReadableArray addAll(WritableArray to, ReadableArray from) {
        Dynamic dynamic;
        for (int i = 0; i < from.size(); i++) {
            dynamic =  from.getDynamic(i);
            pushDynamic(to, dynamic);
            dynamic.recycle();
        }

        return to;
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

