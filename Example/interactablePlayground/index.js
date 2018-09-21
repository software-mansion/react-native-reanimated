import React, { Component } from 'react';
import { StyleSheet, View, FlatList, Text } from 'react-native';
import { RectButton, ScrollView } from 'react-native-gesture-handler';

// Basic Examples
import ChatHeads from './examples/ChatHeads';
import SwipeableCard from './examples/SwipeableCard';
import IconDrawer from './examples/IconDrawer';
import CollapsingHeader from './examples/CollapsingHeader';
import MoreDrawers from './examples/MoreDrawers';
import MoreChatHeads from './examples/MoreChatHeads';
import HandleTouches from './examples/HandleTouches';
import TouchesInside from './examples/TouchesInside';
import TouchesInsideStatic from './examples/TouchesInsideStatic';
import HandleRelayout from './examples/HandleRelayout';
import SideMenu from './examples/SideMenu';
import SnapTo from './examples/SnapTo';
import ChangePosition from './examples/ChangePosition';
import AlertAreas from './examples/AlertAreas';
import CollapsingHeaderWithScroll from './examples/CollapsingHeaderWithScroll';

// Real life Examples
import RowActions1 from './real-life-examples/RowActions1';
import RowActions2 from './real-life-examples/RowActions2';
import NowCard from './real-life-examples/NowCard';
import TinderCard from './real-life-examples/TinderCard';
import NotifPanel from './real-life-examples/NotifPanel';
import MapPanel from './real-life-examples/MapPanel';
import CollapsibleFilter from './real-life-examples/CollapsibleFilter';
import CollapsibleCalendar from './real-life-examples/CollapsibleCalendar';
import RealChatHeads from './real-life-examples/RealChatHeads';

export const SCREENS = {
  IChatHeads: { screen: ChatHeads, title: 'Chat Heads' },
  ISwipeableCard: { screen: SwipeableCard, title: 'Swipeable Card' },
  IMoreDrawers: { screen: MoreDrawers, title: 'More Drawers (row actions)' },
  IMoreChatHeads: { screen: MoreChatHeads, title: 'More Chat Heads' },
  IHandleTouches: { screen: HandleTouches, title: 'Handle Touches' },
  // ITouchesInside: {
  //   screen: TouchesInside,
  //   title: 'Touches Inside (interactive)',
  // },
  // ITouchesInsideStatic: {
  //   screen: TouchesInsideStatic,
  //   title: 'Touches Inside (static)',
  // },
  // IHandleRelayout: { screen: HandleRelayout, title: 'Handle Relayout' },
  ISideMenu: { screen: SideMenu, title: 'Side Menu (imperative cmd)' },
  ISnapTo: { screen: SnapTo, title: 'Snap To (imperative cmd)' },
  IChangePosition: {
    screen: ChangePosition,
    title: 'Change Position (imperative cmd)',
  },
  // IAlertAreas: { screen: AlertAreas, title: 'Alert Areas and Drag Event' },
  ICollapsingHeaderWithScroll: {
    screen: CollapsingHeaderWithScroll,
    title: 'Collapsing Header with Scroll',
  },
  IRowActions1: { screen: RowActions1, title: 'Row Actions (Google Style)' },
  IRowActions2: { screen: RowActions2, title: 'Row Actions (Apple Style)' },
  INowCard: { screen: NowCard, title: 'Google Now-Style Card' },
  ITinderCard: { screen: TinderCard, title: 'Tinder-Style Card' },
  INotifPanel: { screen: NotifPanel, title: 'Notification Panel' },
  IMapPanel: { screen: MapPanel, title: 'Apple Maps-Style Panel' },
  ICollapsibleFilter: {
    screen: CollapsibleFilter,
    title: 'Collapsible Filter',
  },
  ICollapsibleCalendar: {
    screen: CollapsibleCalendar,
    title: 'Collapsible Calendar (Any.do-Style)',
  },
  IRealChatHeads: { screen: RealChatHeads, title: 'Real Chat Heads' },
};

export default class MainScreen extends Component {
  static navigationOptions = {
    title: 'react-native-interactable',
  };
  render() {
    const data = Object.keys(SCREENS).map(key => ({ key }));
    return (
      <FlatList
        style={styles.list}
        data={data}
        ItemSeparatorComponent={ItemSeparator}
        renderItem={props => (
          <MainScreenItem
            {...props}
            onPressItem={({ key }) => this.props.navigation.navigate(key)}
          />
        )}
        renderScrollComponent={props => <ScrollView {...props} />}
      />
    );
  }
}

const ItemSeparator = () => <View style={styles.separator} />;

class MainScreenItem extends React.Component {
  _onPress = () => this.props.onPressItem(this.props.item);
  render() {
    const { key } = this.props.item;
    return (
      <RectButton style={styles.button} onPress={this._onPress}>
        <Text style={styles.buttonText}>{SCREENS[key].title || key}</Text>
      </RectButton>
    );
  }
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#EFEFF4',
  },
  separator: {
    height: 1,
    backgroundColor: '#DBDBE0',
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  button: {
    flex: 1,
    height: 60,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
