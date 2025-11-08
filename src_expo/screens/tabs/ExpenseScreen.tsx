import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../../components/CustomHeader';
import { useNavigation } from '@react-navigation/native';

// Memoized card component for better performance
const SummaryCard = React.memo(({ title, value, backgroundColor, icon }) => (
    <View style={[styles.card, { backgroundColor }]}>
        <Ionicons name={icon} size={24} color="black" style={styles.cardIcon} />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
    </View>
));

// Memoized tip item component for FlatList
const TipItem = React.memo(({ item }) => (
    <View style={styles.tipItem}>
        <Ionicons name="checkmark-circle" size={18} color="#28A745" style={styles.tipIcon} />
        <Text style={styles.tipText}>{item.text}</Text>
    </View>
));

// Memoized empty state component
const EmptyState = React.memo(({ icon, message, actionText, onAction }) => (
    <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateIconContainer}>
            <Ionicons name={icon} size={80} color="#007AFF" />
        </View>
        <Text style={styles.emptyStateTitle}>{message}</Text>
        {actionText && (
            <TouchableOpacity style={styles.actionButton} onPress={onAction}>
                <Text style={styles.actionButtonText}>{actionText}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
        )}
    </View>
));

const ExpenseScreen = () => {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('Submit');
    // Memoize summary data to prevent unnecessary recalculations
    const summaryData = useMemo(() => [
        { id: 'total', title: 'Total', value: 12, color: 'white', icon: 'document-text-outline' },
        { id: 'pending', title: 'Pending', value: 3, color: 'white', icon: 'time-outline' },
        { id: 'approved', title: 'Approved', value: 9, color: 'white', icon: 'checkmark-circle-outline' }
    ], []);

    // Memoize tips data for FlatList
    const tipsData = useMemo(() => [
        { id: '1', text: 'Always attach clear receipt images' },
        { id: '2', text: 'Provide detailed descriptions' },
        { id: '3', text: 'Submit claims within 30 days' },
        { id: '4', text: 'Ensure amounts match receipts' }
    ], []);

    // Optimized tab switch handler
    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
    }, []);

    // Action handlers
    const handleSubmitExpense = useCallback(() => {
        // Navigate to expense submission form
        console.log('Navigate to expense form');
    }, []);

    const handleNotification = useCallback(() => {
        console.log('Open notifications');
    }, []);

    // FlatList render functions
    const renderTipItem = useCallback(({ item }) => <TipItem item={item} />, []);

    const keyExtractor = useCallback((item) => item.id, []);

    return (
        <View style={styles.container}>
            <CustomHeader
                title="Expense"
                showBackButton
                onBackPress={() => navigation.goBack()}
                rightComponent={
                    <TouchableOpacity onPress={handleNotification}>
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                }
                backgroundColor="black"
            />
            <View style={styles.summaryRow}>
                {summaryData.map((item) => (
                    <SummaryCard
                        key={item.id}
                        title={item.title}
                        value={item.value}
                        backgroundColor={item.color}
                        icon={item.icon}
                    />
                ))}
            </View>
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'Submit' && styles.activeTab]}
                    onPress={() => handleTabChange('Submit')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color={activeTab === 'Submit' ? '#fff' : '#555'}
                        style={styles.tabIcon}
                    />
                    <Text style={[styles.tabText, activeTab === 'Submit' && styles.activeTabText]}>
                        Submit
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'History' && styles.activeTab]}
                    onPress={() => handleTabChange('History')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="receipt-outline"
                        size={20}
                        color={activeTab === 'History' ? '#fff' : '#555'}
                        style={styles.tabIcon}
                    />
                    <Text style={[styles.tabText, activeTab === 'History' && styles.activeTabText]}>
                        History
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content Section with Better UX */}
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'Submit' ? (
                    <>
                        <View style={styles.submitCard}>
                            <View style={styles.submitIconContainer}>
                                <Ionicons name="wallet-outline" size={48} color="#007AFF" />
                            </View>
                            <Text style={styles.submitTitle}>Submit New Expense</Text>
                            <Text style={styles.submitDescription}>
                                Create a reimbursement request for your business expenses
                            </Text>
                            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitExpense}>
                                <Ionicons name="add-circle" size={20} color="#fff" style={styles.buttonIcon} />
                                <Text style={styles.submitButtonText}>New Expense Claim</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tips Card */}
                        <View style={styles.tipsCard}>
                            <View style={styles.tipsHeader}>
                                <Ionicons name="bulb" size={24} color="#FFA500" />
                                <Text style={styles.tipsTitle}>Tips for Quick Approval</Text>
                            </View>
                            <FlatList
                                data={tipsData}
                                renderItem={renderTipItem}
                                keyExtractor={keyExtractor}
                                scrollEnabled={false}
                                showsVerticalScrollIndicator={false}
                            />
                        </View>
                    </>
                ) : (
                    <EmptyState
                        icon="receipt"
                        message="No expense history yet"
                        actionText={null}
                    />
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFF'
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 16,
        paddingHorizontal: 16,
    },
    card: {
        flex: 1,
        marginHorizontal: 6,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardIcon: {
        marginBottom: 4,
    },
    cardTitle: {
        color: 'black',
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.9,
    },
    cardValue: {
        color: 'black',
        fontSize: 26,
        fontWeight: '700',
        marginTop: 4
    },

    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#E5E5E5',
        borderRadius: 12,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    tabIcon: {
        marginRight: 6,
    },
    tabText: {
        fontSize: 15,
        color: '#555',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: '600',
    },

    content: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    // Submit Card Styles
    submitCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    submitIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E8F4FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    submitTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 12,
        textAlign: 'center',
    },
    submitDescription: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
        paddingHorizontal: 10,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        width: '100%',
    },
    buttonIcon: {
        marginRight: 8,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },

    // Tips Card Styles
    tipsCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 4,
    },
    tipsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    tipsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginLeft: 10,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    tipIcon: {
        marginRight: 10,
        marginTop: 2,
    },
    tipText: {
        flex: 1,
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
    },

    // Empty State Styles
    emptyStateContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#E8F4FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyStateTitle: {
        fontSize: 18,
        color: '#333',
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 25,
        marginTop: 20,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
});

export default ExpenseScreen;