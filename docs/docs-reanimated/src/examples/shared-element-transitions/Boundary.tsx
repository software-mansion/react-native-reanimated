import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Caption,
  CodeLine,
  Control,
  DemoLayout,
  Segmented,
} from './kit/controls';
import { Box, FlightLayer, allChannels, timing, useFlight } from './kit/flight';
import {
  Phone,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  STATUS_BAR_HEIGHT,
} from './kit/Phone';
import { palette, useDemoTheme } from './kit/theme';

type Tab = 'home' | 'profile';
type ProfileActive = 'focused' | 'false';

const TAG = 'avatar';
const TAB_BAR_HEIGHT = 58;

const BOXES: Record<Tab, Box> = {
  home: {
    x: SCREEN_WIDTH - 16 - 34,
    y: STATUS_BAR_HEIGHT + 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.purple,
  },
  profile: {
    x: (SCREEN_WIDTH - 112) / 2,
    y: STATUS_BAR_HEIGHT + 46,
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: palette.yellow,
  },
};

const ACTIVE_OPTIONS = [
  { value: 'focused', label: 'isFocused' },
  { value: 'false', label: 'false' },
] as const;

export default function BoundaryDemo({ width }: { width?: number }) {
  const theme = useDemoTheme();
  const [tab, setTab] = useState<Tab>('home');
  const [profileActive, setProfileActive] = useState<ProfileActive>('focused');
  const flight = useFlight();
  const busy = flight.pairs.length > 0;

  const isActive = (screen: Tab) =>
    tab === screen && (screen === 'home' || profileActive === 'focused');

  const switchTo = (next: Tab) => {
    if (next === tab || busy) {
      return;
    }
    const profileBoundaryActive = profileActive === 'focused';
    if (profileBoundaryActive) {
      flight.start({
        pairs: [
          { tag: TAG, from: BOXES[tab], to: BOXES[next], content: <Avatar /> },
        ],
        animations: allChannels(timing()),
      });
    }
    setTab(next);
  };

  const avatar = (screen: Tab) => (
    <View
      style={[styles.avatar, frame(BOXES[screen]), { opacity: busy ? 0 : 1 }]}>
      <Avatar />
    </View>
  );

  const home = (
    <View style={[styles.screen, { backgroundColor: theme.screen }]}>
      <Text style={[styles.greeting, { color: theme.text }]}>Hi, Ada</Text>
      <Text style={[styles.subtle, { color: theme.subtle }]}>
        3 new messages
      </Text>
      {avatar('home')}
      {[palette.blue, palette.green, palette.pink].map((color, index) => (
        <View
          key={color}
          style={[
            styles.message,
            {
              top: STATUS_BAR_HEIGHT + 78 + index * 62,
              backgroundColor: theme.surface,
            },
          ]}>
          <View style={[styles.messageDot, { backgroundColor: color }]} />
          <View style={styles.messageLines}>
            <View
              style={[
                styles.line,
                { width: '70%', backgroundColor: theme.line },
              ]}
            />
            <View
              style={[
                styles.line,
                { width: '45%', backgroundColor: theme.line },
              ]}
            />
          </View>
        </View>
      ))}
      <BoundaryBadge active={isActive('home')} />
    </View>
  );

  const profile = (
    <View style={[styles.screen, { backgroundColor: theme.screen }]}>
      {avatar('profile')}
      <Text style={[styles.profileName, { color: theme.text }]}>
        Ada Lovelace
      </Text>
      <Text style={[styles.profileRole, { color: theme.subtle }]}>
        Analytical Engine team
      </Text>
      <View style={styles.stats}>
        {['12', '48', '7'].map((value) => (
          <View
            key={value}
            style={[styles.stat, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      <BoundaryBadge active={isActive('profile')} />
    </View>
  );

  const phone = (
    <Phone>
      <View
        style={[styles.fill, { display: tab === 'home' ? 'flex' : 'none' }]}>
        {home}
      </View>
      <View
        style={[styles.fill, { display: tab === 'profile' ? 'flex' : 'none' }]}>
        {profile}
      </View>
      <FlightLayer flight={flight} />
      <View
        style={[
          styles.tabBar,
          { backgroundColor: theme.screen, borderColor: theme.line },
        ]}>
        {(['home', 'profile'] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => switchTo(item)}
            style={styles.tabItem}>
            <View
              style={[
                styles.tabIcon,
                item === 'home' ? styles.tabIconHome : styles.tabIconProfile,
                { borderColor: tab === item ? theme.accent : theme.subtle },
              ]}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: tab === item ? theme.accent : theme.subtle },
              ]}>
              {item === 'home' ? 'Home' : 'Profile'}
            </Text>
          </Pressable>
        ))}
      </View>
    </Phone>
  );

  return (
    <DemoLayout width={width} phone={phone}>
      <Caption>Switch the tabs at the bottom of the phone.</Caption>
      <Control label="isActive of the Profile boundary">
        <Segmented
          value={profileActive}
          options={ACTIVE_OPTIONS}
          onChange={setProfileActive}
        />
        <CodeLine>
          {`<SharedTransitionBoundary isActive={${profileActive === 'focused' ? 'isFocused' : 'false'}}>`}
        </CodeLine>
      </Control>
      <Caption>
        {profileActive === 'focused'
          ? 'The boundary of the tab that you open becomes active, so the avatar flies between the tabs.'
          : 'The Profile boundary is never active. The tabs change without a shared transition.'}
      </Caption>
    </DemoLayout>
  );
}

function Avatar() {
  return (
    <View style={styles.fill}>
      <View style={styles.head} />
      <View style={styles.shoulders} />
    </View>
  );
}

function BoundaryBadge({ active }: { active: boolean }) {
  const theme = useDemoTheme();
  const color = active ? '#2e9b78' : theme.subtle;
  return (
    <View style={[styles.boundaryBadge, { borderColor: color }]}>
      <View style={[styles.boundaryDot, { backgroundColor: color }]} />
      <Text style={[styles.boundaryText, { color, fontFamily: theme.mono }]}>
        {`isActive={${active}}`}
      </Text>
    </View>
  );
}

function frame(box: Box) {
  return {
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    borderRadius: box.borderRadius,
    backgroundColor: box.backgroundColor,
  };
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  greeting: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 8,
    left: 16,
    fontSize: 20,
    fontWeight: '700',
  },
  subtle: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 36,
    left: 16,
    fontSize: 11,
  },
  avatar: {
    position: 'absolute',
    overflow: 'hidden',
  },
  head: {
    position: 'absolute',
    top: '20%',
    left: '34%',
    width: '32%',
    height: '32%',
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 26, 114, 0.75)',
  },
  shoulders: {
    position: 'absolute',
    top: '58%',
    left: '18%',
    width: '64%',
    height: '60%',
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 26, 114, 0.75)',
  },
  message: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
  },
  messageDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  messageLines: {
    flex: 1,
    gap: 6,
  },
  line: {
    height: 6,
    borderRadius: 3,
  },
  profileName: {
    position: 'absolute',
    top: BOXES.profile.y + BOXES.profile.height + 14,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  profileRole: {
    position: 'absolute',
    top: BOXES.profile.y + BOXES.profile.height + 38,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
  },
  stats: {
    position: 'absolute',
    top: BOXES.profile.y + BOXES.profile.height + 66,
    left: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  boundaryBadge: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: 6,
  },
  boundaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  boundaryText: {
    fontSize: 9,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 12,
    zIndex: 80,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabIcon: {
    width: 16,
    height: 16,
    borderWidth: 2,
  },
  tabIconHome: {
    borderRadius: 4,
  },
  tabIconProfile: {
    borderRadius: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
