import React, {
    useContext,
    useState,
    useCallback
} from "react";
import {
    StyleSheet,
    View,
    TouchableWithoutFeedback,
    Text
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useDerivedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const styles = StyleSheet.create({
    container: {
        width: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    primary: {
        height: 140,
        backgroundColor: "#222222",
    },
    alt: {
        backgroundColor: "#FF4136",
        height: 230,
    },
    text: {
        fontSize: 24,
        color: "#FFFFFF",
    },
});

interface FlatListElementProps {
    text: string;
    selected: boolean;
    onPress: (value: any) => void;
}

const FlatListElement = ({
    text,
    onPress,
    selected
}: FlatListElementProps) => {
    const open = useSharedValue(selected);
    const progress = useDerivedValue(() =>
        open.value ? withSpring(1, {
            damping: 14,
            stiffness: 130
        }) : withSpring(0, {
            damping: 14,
            stiffness: 130
        })
    );
    const progressAlpha = useDerivedValue(() => (open.value ? withTiming(1) : withTiming(0)));
    const height = useSharedValue(140);
    const style = useAnimatedStyle(() => ({
        height: height.value + 230 * progress.value + 1,
    }));

    return ( 
        <Animated.View style = {style} >
            <TouchableWithoutFeedback onPress = {onPress} >
                <View style = {[styles.primary, styles.container]} >
                    <Text style = {styles.text} > 
                        {
                            text
                        } 
                    </Text> 
                </View> 
            </TouchableWithoutFeedback> 
            {
                selected && ( 
                <TouchableWithoutFeedback onPress = {onPress} >
                    <View style = {[styles.alt, styles.container]} >
                        <Text style = {styles.text} > 
                            ALT {text} 
                        </Text> 
                    </View> 
                </TouchableWithoutFeedback>
                )
            } 
        </Animated.View>
    );
};

export default FlatListElement;