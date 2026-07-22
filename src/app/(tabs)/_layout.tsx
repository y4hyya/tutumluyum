import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, borders, fonts, spacing } from '@/theme';

/** Structural subset of react-navigation's BottomTabBarProps — enough for a
 *  hand-built bar without importing the (non-hoisted) navigation package. */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

function BrutalTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={[styles.tab, focused && styles.tabActive]}>
            <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <BrutalTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: 'ÖZET' }} />
      <Tabs.Screen name="transactions" options={{ title: 'İŞLEM' }} />
      <Tabs.Screen name="subscriptions" options={{ title: 'ABONELİK' }} />
      <Tabs.Screen name="statements" options={{ title: 'EKSTRE' }} />
      <Tabs.Screen name="settings" options={{ title: 'AYAR' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.paper,
    borderTopWidth: borders.thick,
    borderTopColor: colors.ink,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderLeftWidth: borders.std,
    borderRightWidth: borders.std,
    borderColor: colors.ink,
  },
  label: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.muted,
  },
  labelActive: {
    color: colors.ink,
  },
});
