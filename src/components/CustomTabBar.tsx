import * as React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Route = { key: string; name: string }; // minimal typing to avoid importing nav types

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const activeColor = '#111827';
  const inactiveColor = '#6b7280';

  const iconForRoute = (name: string, focused: boolean) => {
    switch (name) {
      case 'HomeScreen':
        return focused ? 'home-sharp' : 'home-outline';
      case 'Attendance':
        return focused ? 'stopwatch' : 'stopwatch-outline';
      case 'Leaves':
        return focused ? 'calendar' : 'calendar-outline';
      case 'Expense':
        return focused ? 'wallet' : 'wallet-outline';
      case 'Leads':
        return focused ? 'people' : 'people-outline';
      default:
        return focused ? 'ellipse' : 'ellipse-outline';
    }
  };

  return (
    <View style={styles.container}>
      {state.routes.map((route: Route, index: number) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
        return (
          <Pressable key={route.key} accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} style={styles.item}>
            <Ionicons name={iconForRoute(route.name, focused)} size={focused ? 24 : 22} color={focused ? activeColor : inactiveColor} />
            <Text style={[styles.label, { color: focused ? activeColor : inactiveColor }]} numberOfLines={1}>
              {route.name === 'HomeScreen' ? 'Home' : route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: Platform.OS === 'ios' ? 0.5 : 0.8,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
    paddingTop: 4,
    height: Platform.OS === 'ios' ? 64 : 60,
  },
  item: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, flex: 1 },
  label: { fontSize: 11, marginTop: 2 },
});

