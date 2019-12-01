package com.swmansion.reanimated.reflection;

import androidx.annotation.StringDef;

import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableType;

import java.lang.annotation.Retention;

import static java.lang.annotation.RetentionPolicy.SOURCE;

class ReflectionUtils {
    static Boolean isNumber(Object o){
        return o instanceof Number ||
                o.equals(int.class) || o.equals(Integer.class) ||
                o.equals(float.class) || o.equals(Float.class) ||
                o.equals(double.class) || o.equals(Double.class) ||
                o.equals(long.class) || o.equals(Long.class) ||
                o.equals(short.class) || o.equals(Short.class);
    }

    static Boolean isInteger(Object o){
        return o instanceof Integer || o.equals(int.class) || o.equals(Integer.class);
    }

    static boolean isInteger(String str) {
        return str.matches("-?\\d");
    }

    private static Boolean isString(Object o){
        return o instanceof String || o.equals(String.class);
    }

    private static Boolean isBoolean(Object o){
        return o instanceof Boolean || o.equals(boolean.class) || o.equals(Boolean.class);
    }

    private static Boolean isNull(Object o){
        return o == null;
    }

    private static Boolean isArray(Object o){
        return o.getClass().isArray() || o instanceof ReadableArray;
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

}
