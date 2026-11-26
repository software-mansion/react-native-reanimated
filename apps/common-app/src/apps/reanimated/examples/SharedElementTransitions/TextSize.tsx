import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedTransition } from 'react-native-reanimated';

import { withSharedTransitionBoundary } from './withSharedTransitionBoundary';

const ARTICLES = [
  { id: '1', title: 'Morning tide', color: '#3d7dd8' },
  { id: '2', title: 'Granite ridge', color: '#d8743d' },
  { id: '3', title: 'Quiet orchard', color: '#4fa36b' },
];

const transition = SharedTransition.duration(600);

type Params = { List: undefined; Article: { id: string } };
const Stack = createNativeStackNavigator<Params>();

function ListContent({ navigation }: NativeStackScreenProps<Params, 'List'>) {
  return (
    <View style={styles.screen}>
      {ARTICLES.map((article) => (
        <Pressable
          key={article.id}
          testID={`article-${article.id}`}
          style={styles.row}
          onPress={() => navigation.navigate('Article', { id: article.id })}>
          <Animated.View
            sharedTransitionTag={`tile-${article.id}`}
            sharedTransitionStyle={transition}
            style={[styles.tile, { backgroundColor: article.color }]}
          />
          <Animated.Text
            sharedTransitionTag={`title-${article.id}`}
            sharedTransitionStyle={transition}
            style={styles.rowTitle}>
            {article.title}
          </Animated.Text>
        </Pressable>
      ))}
    </View>
  );
}

function ArticleContent({
  navigation,
  route,
}: NativeStackScreenProps<Params, 'Article'>) {
  const article = ARTICLES.find(({ id }) => id === route.params.id)!;
  return (
    <View style={styles.screen}>
      <Animated.View
        sharedTransitionTag={`tile-${article.id}`}
        sharedTransitionStyle={transition}
        style={[styles.banner, { backgroundColor: article.color }]}
      />
      <Animated.Text
        sharedTransitionTag={`title-${article.id}`}
        sharedTransitionStyle={transition}
        style={styles.articleTitle}>
        {article.title}
      </Animated.Text>
      <Text style={styles.body}>
        Low water uncovers the sandbar for an hour, long enough to walk out to
        the lighthouse and back before the channel fills again.
      </Text>
      <Pressable
        testID="back"
        style={styles.back}
        onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const List = withSharedTransitionBoundary(ListContent);
const Article = withSharedTransitionBoundary(ArticleContent);

export default function TextSizeExample() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="List" component={List} />
      <Stack.Screen name="Article" component={Article} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white', padding: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  tile: { width: 56, height: 56, borderRadius: 12, marginRight: 14 },
  rowTitle: { fontSize: 17, fontWeight: '600', color: '#1b1f24' },
  banner: { height: 200, borderRadius: 20, marginBottom: 20 },
  articleTitle: {
    fontSize: 34,
    fontWeight: '600',
    color: '#1b1f24',
    marginBottom: 12,
  },
  body: { fontSize: 16, lineHeight: 22, color: '#57606a' },
  back: { marginTop: 24, alignSelf: 'flex-start' },
  backText: { fontSize: 17, color: '#3d7dd8' },
});
