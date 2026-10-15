import { Tabs } from 'expo-router';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { ColorValue } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeProvider';
import { AppIcon, IconName } from '../../components/Icon';
import { BrandMark } from '../../components/BrandMark';

const tabs: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'shorts', label: 'Shorts', icon: 'shorts' },
  { name: 'create', label: 'Create', icon: 'create' },
  { name: 'subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
  { name: 'library', label: 'Library', icon: 'library' },
];

export default function TabLayout() {
  const { colors } = useTheme();
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarShowLabel: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: [styles.bar, { backgroundColor: colors.background, borderTopColor: colors.border }],
    tabBarItemStyle: styles.item,
    tabBarIcon: ({ color, focused }) => {
      const tab = tabs.find((item) => item.name === route.name) ?? tabs[0];
      return <TabItem {...tab} focused={focused} color={color} />;
    },
  })}>
    {tabs.map((tab) => <Tabs.Screen key={tab.name} name={tab.name} options={{ tabBarLabel: tab.label }} />)}
  </Tabs>;
}

function TabItem({ name, label, icon, focused, color }: { name: string; label: string; icon: IconName; focused: boolean; color: ColorValue }) {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: focused ? 1 : 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [focused, progress]);
  const isCreate = name === 'create';
  return <View style={styles.itemContent}>
    {isCreate
      ? <View style={[styles.createMark, { backgroundColor: colors.accentSoft }]}><BrandMark size={26} /></View>
      : <View style={styles.iconArea}>
        <Animated.View style={[styles.activePill, { backgroundColor: colors.accentSoft, opacity: progress }]} />
        <AppIcon name={icon} color={focused ? colors.accent : color} size={21} />
      </View>}
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.label, { color: focused ? colors.text : colors.muted, fontWeight: focused ? '700' : '500' }]}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  bar: { height: 68, paddingTop: 4, paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth, elevation: 0 },
  item: { paddingTop: 0, paddingHorizontal: 1 },
  itemContent: { width: '100%', height: 58, alignItems: 'center', justifyContent: 'space-between' },
  iconArea: { width: 46, height: 30, alignItems: 'center', justifyContent: 'center' },
  activePill: { ...StyleSheet.absoluteFill, borderRadius: 12 },
  createMark: { width: 36, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { width: '100%', textAlign: 'center', fontSize: 9.5, letterSpacing: -0.35, includeFontPadding: false },
});
