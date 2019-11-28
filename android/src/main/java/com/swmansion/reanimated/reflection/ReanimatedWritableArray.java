package com.swmansion.reanimated.reflection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableNativeMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;

import static com.swmansion.reanimated.reflection.ReflectionUtils.isInteger;
import static com.swmansion.reanimated.reflection.ReflectionUtils.toDouble;

public class ReanimatedWritableArray extends WritableNativeArray {

    public static ReanimatedWritableArray fromArray(Object[] array){
        ReanimatedWritableArray out = new ReanimatedWritableArray();
        for (int i = 0; i < array.length; i++) {
            out.pushDynamic(array[i]);
        }
        return out;
    }

    public static ReanimatedWritableArray fromArray(ReadableArray array) {
        if (array instanceof ReanimatedWritableArray) {
            return ((ReanimatedWritableArray) array);
        } else {
            ReanimatedWritableArray out = new ReanimatedWritableArray();
            for (Object value: array.toArrayList()) {
                out.pushDynamic(value);
            }
            return out;
        }
    }

    @Nullable
    @Override
    public ReadableNativeArray getArray(int index) {
        return fromArray(super.getArray(index));
    }

    @Override
    public boolean getBoolean(int index) {
        return super.getType(index) == ReadableType.Boolean ?
                super.getBoolean(index) :
                super.getDouble(index) == 1;
    }

    @Override
    public double getDouble(int index) {
        return super.getType(index) == ReadableType.Boolean ?
                toDouble(super.getBoolean(index)) :
                super.getDouble(index);
    }

    public void pushDynamic(Object o) {
        pushVariant(this, o);
    }

    @Nullable
    @Override
    public ReadableNativeMap getMap(int index) {
        return ReanimatedWritableMap.fromMap(super.getMap(index));
    }

    public ReanimatedWritableArray copy() {
        ReanimatedWritableArray copy = new ReanimatedWritableArray();
        addAll(copy, this);
        return copy;
    }

    @Override
    public String toString() {
        return super.toString();
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

}
