import { Tabs } from 'expo-router';
import { Animated, Image, StyleSheet, View } from 'react-native';
import type { ColorValue } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements/PlatformPressable';
import { BottomTabBar } from 'expo-router/build/react-navigation/bottom-tabs';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useCallback, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { TabBarScrollContext } from '../../context/TabBarScrollContext';

const tabIcons: Record<string, ImageSourcePropType> = {
  home: require('../../../assets/tab-icons/home.png'),
  shorts: require('../../../assets/tab-icons/shorts.png'),
  create: require('../../../assets/tab-icons/create.png'),
  subscriptions: require('../../../assets/tab-icons/subscriptions.png'),
  library: require('../../../assets/tab-icons/library.png'),
};

const tabs: { name: string; label: string; icon: keyof typeof tabIcons }[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'shorts', label: 'Shorts', icon: 'shorts' },
  { name: 'create', label: 'Create', icon: 'create' },
  { name: 'subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
  { name: 'library', label: 'Library', icon: 'library' },
];

export default function TabLayout() {
  const { colors } = useTheme();
  const offset = useRef(new Animated.Value(0)).current;
  const hiddenRef = useRef(false);
  const [hidden, setHidden] = useState(false);
  const setTabBarHidden = useCallback((next: boolean) => {
    if (hiddenRef.current === next) return;
    hiddenRef.current = next;
    setHidden(next);
    Animated.timing(offset, { toValue: next ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [offset]);
  const renderTabBar = useCallback((props: BottomTabBarProps) => (
    <Animated.View pointerEvents={hidden ? 'none' : 'auto'} style={{ transform: [{ translateY: offset.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }) }], opacity: offset.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0, 0] }) }}>
      <BottomTabBar {...props} />
    </Animated.View>
  ), [hidden, offset]);
  return <TabBarScrollContext.Provider value={setTabBarHidden}><Tabs tabBar={renderTabBar} screenOptions={({ route }) => ({
    headerShown: false,
    tabBarShowLabel: true,
    tabBarLabelStyle: styles.label,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    safeAreaInsets: { bottom: 0 },
    tabBarHideOnKeyboard: true,
    tabBarButton: (props) => <PlatformPressable {...props} android_ripple={{ color: 'transparent', borderless: false }} pressOpacity={1} />,
    tabBarBackground: () => <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}><View style={[styles.divider, { backgroundColor: '#171717', opacity: 0.18 }]} /></View>,
    tabBarStyle: [styles.bar, { backgroundColor: colors.background, borderTopColor: 'transparent' }],
    tabBarItemStyle: [styles.item, route.name === 'create' && styles.createItem],
    tabBarIcon: ({ color }) => {
      const tab = tabs.find((item) => item.name === route.name) ?? tabs[0];
      return <TabItem {...tab} color={color} />;
    },
  })}>
    {tabs.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ tabBarLabel: tab.label }} />)}
  </Tabs></TabBarScrollContext.Provider>;
}

function TabItem({ name, icon, color }: { name: string; icon: keyof typeof tabIcons; color: ColorValue }) {
  return <View style={[styles.iconArea, name === 'subscriptions' && styles.subscriptionsIconArea]}>
    <Image source={tabIcons[icon]} style={[styles.tabIcon, { tintColor: color }]} />
  </View>;
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 48, minHeight: 48, paddingTop: 0, paddingBottom: 0, borderTopWidth: 0, elevation: 0, shadowOpacity: 0 },
  divider: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  item: { flex: 1, paddingTop: 0, paddingHorizontal: 1 },
  createItem: { transform: [{ translateX: -6 }] },
  iconArea: { width: 46, height: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10, letterSpacing: -0.25, includeFontPadding: false, textAlign: 'center', transform: [{ translateY: -2 }] },
  subscriptionsIconArea: { width: 54, height: 32 },
  tabIcon: { width: 28, height: 28, resizeMode: 'contain', transform: [{ translateY: -3 }] },
});
