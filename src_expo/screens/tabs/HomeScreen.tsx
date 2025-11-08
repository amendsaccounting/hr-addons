import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'

const HomeScreen = () => {
    const username = 'John Doe'
    const employeeId = 'EMP12345' 
    const notificationCount = 5

    // Sample recent activities data
    const recentActivities = [
        {
            id: 1,
            type: 'clock-in',
            title: 'Clock In',
            description: 'You clocked in at 9:00 AM',
            time: 'Today',
            icon: 'time',
        },
        {
            id: 2,
            type: 'leave',
            title: 'Leave Approved',
            description: 'Your leave request has been approved',
            time: '2 days ago',
            icon: 'checkmark-circle',
        },
        {
            id: 3,
            type: 'payslip',
            title: 'Payslip Generated',
            description: 'Your payslip for October is ready',
            time: '5 days ago',
            icon: 'document-text',
        },
        {
            id: 4,
            type: 'review',
            title: 'Performance Review Due',
            description: 'Complete your self-assessment',
            time: 'Due in 3 days',
            icon: 'star',
        },
    ]

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.welcomeText}>Welcome Back</Text>
                    <Text style={styles.username}>{username}</Text>
                    <Text style={styles.employeeId}>Employee ID: {employeeId}</Text>
                </View>
                <TouchableOpacity style={styles.notificationButton}>
                    <Ionicons name="notifications-outline" size={24} color="#fff" />
                    {notificationCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {notificationCount > 99 ? '99+' : notificationCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.content} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                {/* Quick Overview Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Overview</Text>
                    <View style={styles.cardsContainer}>
                        {/* Hours Card */}
                        <TouchableOpacity style={styles.card}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="time-outline" size={24} color="#000" />
                            </View>
                            <Text style={styles.cardValue}>160</Text>
                            <Text style={styles.cardLabel}>Hours</Text>
                        </TouchableOpacity>

                        {/* Leave Card */}
                        <TouchableOpacity style={styles.card}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="calendar-outline" size={24} color="#000" />
                            </View>
                            <Text style={styles.cardValue}>12</Text>
                            <Text style={styles.cardLabel}>Leave</Text>
                        </TouchableOpacity>

                        {/* Attendance Card */}
                        <TouchableOpacity style={styles.card}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="checkmark-circle-outline" size={24} color="#000" />
                            </View>
                            <Text style={styles.cardValue}>95%</Text>
                            <Text style={styles.cardLabel}>Attendance</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Activity Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.activityContainer}>
                        {recentActivities.map((activity) => (
                            <TouchableOpacity key={activity.id} style={styles.activityItem}>
                                <View style={styles.activityIconContainer}>
                                    <Ionicons name={activity.icon} size={20} color="#000" />
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityTitle}>{activity.title}</Text>
                                    <Text style={styles.activityDescription}>{activity.description}</Text>
                                </View>
                                <Text style={styles.activityTime}>{activity.time}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Quick Actions Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsContainer}>
                        {/* Apply Leave */}
                        <TouchableOpacity style={styles.actionButton}>
                            <Text style={styles.actionButtonText}>Apply Leave</Text>
                        </TouchableOpacity>
                        
                        {/* View Payslip */}
                        <TouchableOpacity style={styles.actionButton}>
                            <Text style={styles.actionButtonText}>View Payslip</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        backgroundColor: '#000',
        paddingTop: 50, 
        paddingBottom: 15,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flex: 1,
    },
    welcomeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '400',
    },
    username: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 2,
    },
    employeeId: {
        color: '#B0B0B0', 
        fontSize: 12,
        fontWeight: '400',
        marginTop: 2,
    },
    notificationButton: {
        padding: 6,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 2,
        right: 4,
        backgroundColor: 'red', 
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentContainer: {
        paddingBottom: 10,
    },
    section: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 10,
    },
    seeAllText: {
        fontSize: 13,
        color: '#000',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    cardsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#000',
        minHeight: 70,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        backgroundColor: '#f5f5f5',
    },
    cardValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 2,
    },
    cardLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    activityContainer: {
        gap: 8,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#000',
        minHeight: 60,
    },
    activityIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: '#f5f5f5',
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    activityDescription: {
        fontSize: 12,
        color: '#666',
    },
    activityTime: {
        fontSize: 11,
        color: '#999',
        fontWeight: '500',
    },
    quickActionsContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#000',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
})

export default HomeScreen