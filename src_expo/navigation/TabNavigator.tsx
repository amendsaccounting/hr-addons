import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/tabs/HomeScreen';
import AttendanceScreen from '../screens/tabs/AttendanceScreen';
import LeaveScreen from '../screens/tabs/LeaveScreen';
import LeadScreen from '../screens/tabs/LeadScreen';
import ExpenseScreen from '../screens/tabs/ExpenseScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ name, color, size }) => {
    return <Ionicons name={name} size={size} color={color} />;
};

export default function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarShowLabel: true,
                tabBarIcon: ({ color, size, focused }) => {
                    let iconName;

                    switch (route.name) {
                        case 'Home':
                            iconName = focused ? 'home-sharp' : 'home-outline';
                            break;
                        case 'Attendance':
                            iconName = focused ? 'stopwatch' : 'stopwatch-outline';
                            break;
                        case 'Leave':
                            iconName = focused ? 'calendar' : 'calendar-outline';
                            break;
                        case 'Leads':
                            iconName = focused ? 'people' : 'people-outline';
                            break;
                        case 'Expense':
                            iconName = focused ? 'wallet' : 'wallet-outline';
                            break;
                        case 'Profile':
                            iconName = focused ? 'person-circle' : 'person-circle-outline';
                            break;
                        default:
                            iconName = 'ellipse-outline';
                    }

                    return <TabIcon name={iconName} size={focused ? 24 : 22} color={color} />;
                },
                tabBarActiveTintColor: 'black',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    backgroundColor: '#fff',
                    height: 60,
                    borderTopWidth: 0,
                    elevation: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    marginBottom: 5,
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Attendance" component={AttendanceScreen} />
            <Tab.Screen name="Leave" component={LeaveScreen} />
            <Tab.Screen name="Leads" component={LeadScreen} />
            <Tab.Screen name="Expense" component={ExpenseScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
}
