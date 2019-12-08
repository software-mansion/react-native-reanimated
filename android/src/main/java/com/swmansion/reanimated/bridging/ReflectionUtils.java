package com.swmansion.reanimated.bridging;

import androidx.annotation.StringDef;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;

import java.lang.annotation.Retention;

import static java.lang.annotation.RetentionPolicy.SOURCE;

class ReflectionUtils {
    static Boolean isNumber(Object o){
        return o instanceof Number ||
                o.equals(int.class) || o.equals(Integer.class) ||
                o.equals(float.class) || o.equals(Float.class) ||
                o.equals(double.class) || o.equals(Double.class) ||
                o.equals(long.class) || o.equals(Long.class) ||
                o.equals(short.class) || o.equals(Short.class) ||
                (o instanceof Dynamic && ((Dynamic) o).getType().equals(ReadableType.Number));
    }

    static Boolean isInteger(Object o){
        return o instanceof Integer || o.equals(int.class) || o.equals(Integer.class);
    }

    static Boolean isString(Object o){
        return o instanceof String || o.equals(String.class) ||
                (o instanceof Dynamic && ((Dynamic) o).getType().equals(ReadableType.String));
    }

    static Boolean isBoolean(Object o){
        return o instanceof Boolean ||
                o.equals(boolean.class) ||
                o.equals(Boolean.class) ||
                (o instanceof Dynamic && ((Dynamic) o).getType().equals(ReadableType.Boolean));
    }

    static Boolean isNull(Object o){
        return o == null ||
                (o instanceof Dynamic && ((Dynamic) o).getType().equals(ReadableType.Null));
    }

    static Boolean isArray(Object o){
        return o.getClass().isArray() || o instanceof ReadableArray ||
                (o instanceof Dynamic && ((Dynamic) o).getType().equals(ReadableType.Array));
    }

    static ReadableType inferType(Object o){
        if (isNull(o)){
            return ReadableType.Null;
        } else if (o instanceof Dynamic) {
            return ((Dynamic) o).getType();
        } else if(isNumber(o)){
            return ReadableType.Number;
        } else if(isString(o)){
            return ReadableType.String;
        } else if(isBoolean(o)){
            return ReadableType.Boolean;
        } else if(isArray(o)){
            return ReadableType.Array;
        } else {
            return ReadableType.Map;
        }
    }

    static Class inferClass(ReadableType type){
        switch(type){
            case Array:
                return ReadableArray.class;
            case Map:
                return ReadableMap.class;
            case Null:
                return Object.class;
            case Number:
                return Number.class;
            case String:
                return String.class;
            case Boolean:
                return Boolean.class;
            default:
                throw new Error(String.format("Reanimated: this is quite impossible, type %s", type));
        }
    }

    @StringDef({
            PrimitiveNumber.BYTE,
            PrimitiveNumber.INT,
            PrimitiveNumber.FLOAT,
            PrimitiveNumber.LONG,
            PrimitiveNumber.SHORT,
            PrimitiveNumber.BOOLEAN,
    })
    @Retention(SOURCE)
    @interface PrimitiveNumber {
        String BYTE = "byte";
        String INT = "int";
        String FLOAT = "float";
        String LONG = "long";
        String SHORT = "short";
        String BOOLEAN = "boolean";
    }

    @SuppressWarnings("unchecked")
    static <T> T fromDouble(Double value, Class<T> clazz){
        switch (clazz.getName()){
            case PrimitiveNumber.BYTE: return ((T) Byte.valueOf(value.byteValue()));
            case PrimitiveNumber.INT: return ((T) Integer.valueOf(value.intValue()));
            case PrimitiveNumber.FLOAT: return ((T) Float.valueOf(value.floatValue()));
            case PrimitiveNumber.LONG: return ((T) Long.valueOf(value.longValue()));
            case PrimitiveNumber.SHORT: return ((T) Short.valueOf(value.shortValue()));
            case PrimitiveNumber.BOOLEAN: return ((T) Boolean.valueOf(value == 1));
            default: return ((T) value);
        }
    }

    static Double toDouble(Object value) {
        Object o = value;
        if (value instanceof Dynamic){
            switch (((Dynamic) value).getType()) {
                case Boolean:
                    o = ((Dynamic) value).asBoolean();
                    break;
                case Null:
                    o = 0;
                    break;
                case Number:
                    o = ((Dynamic) value).asDouble();
                    break;
                default:
                    throw new JSApplicationIllegalArgumentException(
                            "Can not cast" + value + " of type " + ((Dynamic) value).getType() +
                                    " into " + Double.class.getName()
                    );
            }
        }

        if(isBoolean(o)) {
            return (double) (((Boolean) o) ? 1 : 0);
        } else if (o instanceof Number){
            return ((Number) o).doubleValue();
        } else {
            return (double) o;
        }
    }

    static Object nativeCloneDeep(Object source) {
        if (ReflectionUtils.inferType(source) == ReadableType.Map) {
            WritableNativeMap out = new WritableNativeMap();
            if (source instanceof WritableNativeMap) {
                out.merge((WritableNativeMap) source);
            } else {
                ReadableMapKeySetIterator iterator = ((ReadableMap) source).keySetIterator();
                String key;
                ReadableMap map = ((ReadableMap) source);
                while (iterator.hasNextKey()) {
                    key = iterator.nextKey();
                    ReadableMapResolver.putVariant(out, key, nativeCloneDeep(new ReanimatedDynamic(map.getDynamic(key)).value()));
                }
            }

            return out;
        } else if (ReflectionUtils.inferType(source) == ReadableType.Array) {
            WritableNativeArray out = new WritableNativeArray();
            ReadableArray in = ((ReadableArray) source);
            for (int i = 0; i < in.size(); i++) {
                ReadableArrayResolver.pushVariant(out, nativeCloneDeep(new ReanimatedDynamic(in.getDynamic(i)).value()));
            }
            return out;
        }
        return source;
    }

}
