import React from "react";
import { StyleSheet, View } from "react-native";

import Tabbar from "./components/Tabbar";

interface AppProps {}

export default class TabApp extends React.Component<AppProps> {
  render() {
    return (
      <View style={styles.container}>
        <Tabbar />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eb3345",
    justifyContent: "flex-end",
  },
});
