import React from 'react';
import { Platform, View, Animated, Easing, Dimensions, Pressable, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DashboardScreen from '../screens/tabs/DashboardScreen';
import AttendanceScreen from '../screens/tabs/AttendanceScreen';
import LeaveScreen from '../screens/tabs/LeaveScreen';
import ExpenseScreen from '../screens/tabs/ExpenseScreen';
import LeadScreen from '../screens/tabs/LeadScreen';
import AppHeader from '../components/AppHeader';
import ProfileScreen from '../screens/tabs/samp';

export type TabName = 'Dashboard' | 'Attendance' | 'Leave' | 'Expense' | 'Leads';

type Props = {
  initialTab?: TabName;
};

const Tab = createBottomTabNavigator();

const iconForRoute = (routeName: TabName, focused: boolean) => {
  switch (routeName) {
    case 'Dashboard':
      return focused ? 'home-sharp' : 'home-outline';
    case 'Attendance':
      return focused ? 'stopwatch' : 'stopwatch-outline';
    case 'Leave':
      return focused ? 'calendar' : 'calendar-outline';
    case 'Expense':
      return focused ? 'wallet' : 'wallet-outline';
    case 'Leads':
      return focused ? 'people' : 'people-outline';
    default:
      return focused ? 'ellipse' : 'ellipse-outline';
  }
};

export default function TabNavigator({ initialTab = 'Dashboard' }: Props) {
  const initialRouteName = initialTab;
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileAnim = React.useRef(new Animated.Value(0)).current;
  const openProfile = React.useCallback(() => {
    setProfileOpen(true);
    Animated.timing(profileAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [profileAnim]);
  const closeProfile = React.useCallback(() => {
    Animated.timing(profileAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setProfileOpen(false);
    });
  }, [profileAnim]);
  const screenWidth = Dimensions.get('window').width;
  const slideX = profileAnim.interpolate({ inputRange: [0, 1], outputRange: [screenWidth, 0] });

  return (
    <>
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => (
          <AppHeader
            title={route.name === 'Dashboard' ? 'Addons HR' : route.name}
            rightItems={[{ type: 'bell' }, { type: 'avatar', onPress: openProfile }]}
            variant="dark"
          />
        ),
        tabBarActiveTintColor: '#111827',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: { fontSize: 11 },
        tabBarStyle: {
          borderTopWidth: Platform.OS === 'ios' ? 0.5 : 0.8,
          borderTopColor: '#e5e7eb',
          backgroundColor: '#fff',
          paddingBottom: Platform.OS === 'ios' ? 6 : 4,
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 64 : 60,
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={iconForRoute(route.name as TabName, focused)} size={focused ? 24 : 22} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Leave" component={LeaveScreen} />
      <Tab.Screen name="Expense" component={ExpenseScreen} />
      <Tab.Screen name="Leads" component={LeadScreen} />
    </Tab.Navigator>
    {profileOpen && (
      <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} onPress={closeProfile} />
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '100%', transform: [{ translateX: slideX }] }}>
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <ProfileScreen onOpenPayslips={() => {}} onOpenPersonalInfo={() => {}} />
          </View>
        </Animated.View>
      </View>
    )}
    </>
  );
}
