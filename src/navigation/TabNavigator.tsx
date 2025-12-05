import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, View, Animated, Easing, Dimensions, Pressable, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
(Ionicons as any)?.loadFont?.();
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AttendanceScreen from '../screens/tabs/AttendanceScreen';
import LeaveScreen from '../screens/tabs/LeaveScreen';
import ExpenseScreen from '../screens/tabs/ExpenseScreen';
import LeadScreen from '../screens/tabs/LeadScreen';
import AppHeader from '../components/AppHeader';
import ProfileScreen from '../screens/tabs/ProfileScreen'
import HomeScreen from '../screens/tabs/HomeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchEmployeeProfile } from '../services/profile';
import Config from 'react-native-config';
// Timesheet screens are used as overlays from Home; not part of tabs

export type TabName = 'HomeScreen' | 'Attendance' | 'Leaves' | 'Expense' | 'Leads';

type Props = {
  initialTab?: TabName;
};

const Tab = createBottomTabNavigator();

const iconForRoute = (routeName: TabName, focused: boolean) => {
  switch (routeName) {
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

export default function TabNavigator({ initialTab = 'HomeScreen' }: Props) {
  const initialRouteName = initialTab;
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const storedName = await AsyncStorage.getItem('userFullName');
        let storedImg = await AsyncStorage.getItem('userImage');
        if (storedName) setProfileName(storedName);
        const hostSrc = (Config as any)?.ERP_URL_METHOD || (Config as any)?.ERP_METHOD_URL || (Config as any)?.ERP_URL_RESOURCE || (Config as any)?.ERP_URL || '';
        const host = String(hostSrc || '').replace(/\/$/, '').replace(/\/api\/(resource|method)$/i, '');
        if (storedImg && storedImg.startsWith('/')) storedImg = host + storedImg;
        if (storedImg) setAvatarUri(storedImg);
        if (!storedName || !storedImg) {
          const id = await AsyncStorage.getItem('employeeId');
          if (id) {
            const view = await fetchEmployeeProfile(id);
            if (view) {
              if (!storedImg && view.image) setAvatarUri(view.image);
              if (!storedName && view.name) setProfileName(view.name);
            }
          }
        }
      } catch {}
    })();
  }, []);
  const profileAnim = useRef(new Animated.Value(0)).current;
  const openProfile = useCallback(() => {
    setProfileOpen(true);
    requestAnimationFrame(() => {
      try { profileAnim.stopAnimation(); } catch {}
      Animated.timing(profileAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [profileAnim]);
  const closeProfile = useCallback(() => {
    try { profileAnim.stopAnimation(); } catch {}
    Animated.timing(profileAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setProfileOpen(false);
    });
  }, [profileAnim]);
  const screenWidth = Dimensions.get('window').width;
  const slideX = profileAnim.interpolate({ inputRange: [0, 1], outputRange: [screenWidth, 0] });
  const backdropOpacity = profileAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] });

  return (
    <>
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={({ route }) => ({
        headerShown: true,
        header: () => (
          <AppHeader
            title={route.name === 'HomeScreen' ? 'Addons HR' : route.name}
            rightItems={[
              { type: 'bell' },
              { type: 'avatar', onPress: openProfile, uri: avatarUri || undefined, label: (profileName || 'U').slice(0,1) },
            ]}
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
      <Tab.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Leaves" component={LeaveScreen} />
      <Tab.Screen name="Expense" component={ExpenseScreen} />
      <Tab.Screen name="Leads" component={LeadScreen} />
    </Tab.Navigator>
    {profileOpen && (
      <View pointerEvents="auto" style={[StyleSheet.absoluteFill, { zIndex: 100 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeProfile}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '100%', transform: [{ translateX: slideX }] }}>
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <ProfileScreen onBack={closeProfile} name={profileName || undefined} avatarSource={avatarUri ? { uri: avatarUri } : null} />
          </View>
        </Animated.View>
      </View>
    )}
    </>
  );
}
