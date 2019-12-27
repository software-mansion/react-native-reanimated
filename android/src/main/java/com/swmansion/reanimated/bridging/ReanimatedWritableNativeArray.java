package com.swmansion.reanimated.bridging;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableNativeArray;
import com.facebook.react.bridge.ReadableNativeMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableNativeArray;

import static com.swmansion.reanimated.bridging.BridgingUtils.toDouble;

public class ReanimatedWritableNativeArray extends WritableNativeArray implements ReanimatedBridge.ReanimatedArray {

    public static ReanimatedWritableNativeArray fromArray(Object[] array){
        ReanimatedWritableNativeArray out = new ReanimatedWritableNativeArray();
        for (int i = 0; i < array.length; i++) {
            out.pushDynamic(BridgingUtils.nativeCloneDeep(array[i]));
        }
        return out;
    }

    public static ReanimatedWritableNativeArray fromArray(ReadableArray array) {
        if (array instanceof ReanimatedWritableNativeArray) {
            return ((ReanimatedWritableNativeArray) array);
        } else {
            ReanimatedWritableNativeArray out = new ReanimatedWritableNativeArray();
            for (Object value: array.toArrayList()) {
                out.pushDynamic(BridgingUtils.nativeCloneDeep(value));
            }
            return out;
        }
    }

    private final ReadableArrayResolver resolver;

    public ReanimatedWritableNativeArray() {
        super();
        resolver = new ReadableArrayResolver(this);
    }

    @Override
    public Object resolve(int index) {
        return new ReanimatedDynamic(getDynamic(index)).value();
    }

    @Override
    public ReadableArrayResolver resolver() {
        return resolver;
    }

    @Nullable
    @Override
    public ReadableNativeArray getArray(int index) {
        index = resolver.resolveIndex(index);
        return fromArray(super.getArray(index));
    }

    @Override
    public boolean getBoolean(int index) {
        index = resolver.resolveIndex(index);
        return super.getType(index) == ReadableType.Boolean ?
                super.getBoolean(index) :
                super.getDouble(index) == 1;
    }

    @Override
    public double getDouble(int index) {
        index = resolver.resolveIndex(index);
        return super.getType(index) == ReadableType.Boolean ?
                toDouble(super.getBoolean(index)) :
                super.getDouble(index);
    }

    @NonNull
    @Override
    public Dynamic getDynamic(int index) {
        index = resolver.resolveIndex(index);
        return super.getDynamic(index);
    }

    @Override
    public void pushDynamic(Object o) {
        ReadableArrayResolver.pushVariant(this, BridgingUtils.nativeCloneDeep(o));
    }

    @Override
    public int getInt(int index) {
        index = resolver.resolveIndex(index);
        return super.getInt(index);
    }

    @Nullable
    @Override
    public ReadableNativeMap getMap(int index) {
        index = resolver.resolveIndex(index);
        return ReanimatedWritableNativeMap.fromMap(super.getMap(index));
    }

    @Nullable
    @Override
    public String getString(int index) {
        index = resolver.resolveIndex(index);
        return super.getString(index);
    }

    @NonNull
    @Override
    public ReadableType getType(int index) {
        index = resolver.resolveIndex(index);
        return super.getType(index);
    }

    public ReanimatedWritableNativeArray copy() {
        ReanimatedWritableNativeArray copy = new ReanimatedWritableNativeArray();
        ReadableArrayResolver.addAll(copy, this);
        return copy;
    }


}
