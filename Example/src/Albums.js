import React, {useContext} from 'react';
import {
  Image,
  Dimensions,
  StyleSheet,
  Text,
  Alert,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import * as Tabs from 'react-native-collapsible-tab-view';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import {TouchableOpacity as TouchableOpacityRNGH} from 'react-native-gesture-handler';
import {TabScreenContext} from './context';
import {ScrollView} from 'react-native-gesture-handler';

const width = Dimensions.get('window').width;

const ListEmptyComponent = () => {
  const {headerHeight, scrollY, scrollYCurrent} = Tabs.useTabsContext();

  const translateY = useDerivedValue(() => {
    return Animated.interpolate(
      scrollYCurrent.value,
      [0, headerHeight],
      [-headerHeight / 2, 0],
    );
  }, [scrollY]);

  const stylez = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: translateY.value,
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.listEmpty, stylez]}>
      <Text>Centered Empty List!</Text>
    </Animated.View>
  );
};

export const Albums: React.FC = () => {
  const {covers} = useContext(TabScreenContext);

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  }, []);

  return (
    <Tabs.FlatList
      numColumns={2}
      data={covers}
      ListEmptyComponent={ListEmptyComponent}
      renderItem={({item, index}) => {
        const PressableComponent =
          index % 4 === 0
            ? TouchableOpacityRNGH
            : index % 3 === 0
            ? TouchableWithoutFeedback
            : index % 2 === 0
            ? TouchableOpacity
            : Pressable;
        const PressableComponentString =
          index % 4 === 0
            ? 'TouchableOpacityRNGH'
            : index % 3 === 0
            ? 'TouchableWithoutFeedback'
            : index % 2 === 0
            ? 'TouchableOpacity'
            : 'Pressable';
        return (
          <PressableComponent
            onPress={() => Alert.alert(PressableComponentString)}>
            <Image source={{uri: item}} style={styles.cover} />
            <ScrollView />
          </PressableComponent>
        );
      }}
      keyExtractor={(_, i) => String(i)}
      refreshing={isRefreshing}
      onRefresh={onRefresh}
    />
  );
};

export default Albums;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#343C46',
  },
  cover: {
    borderWidth: 1,
    borderColor: 'black',
    width: width / 2 - 2,
    height: width / 2 - 2,
  },
  listEmpty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    borderColor: 'black',
    borderWidth: 10,
  },
});