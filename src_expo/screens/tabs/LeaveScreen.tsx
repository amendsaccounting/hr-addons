import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Platform, FlatList, Image } from 'react-native';
import React, { useEffect, useState } from 'react';
import CustomHeader from '../../components/CustomHeader';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { ERP_APIKEY, ERP_SECRET, ERP_URL_RESOURCE } from '@env';

const LeaveScreen = () => {
    const navigation = useNavigation();
    const [modalVisible, setModalVisible] = useState(false);
    const [leaveType, setLeaveType] = useState('Annual Leave');
    const [reason, setReason] = useState('');
    const [showPicker, setShowPicker] = useState({ from: false, to: false });
    const [dates, setDates] = useState({ from: new Date(), to: new Date() });
    const [showDropdown, setShowDropdown] = useState(false);
    const [leaveOptions, setLeaveOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const leaveData = [
        { type: 'Annual Leave', used: 9, total: 10 },
        { type: 'Casual Leave', used: 2, total: 10 },
        { type: 'Sick Leave', used: 1, total: 10 },
    ];
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [leaveBalances, setLeaveBalances] = useState([]);

    console.log("leaveBalances====>", leaveBalances);

    // ✅ Fetch leave types from ERPNext
    useEffect(() => {
        const fetchLeaveTypes = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${ERP_URL_RESOURCE}/Leave Type`, {
                    headers: {
                        Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}`,
                    },
                });
                const types = response.data.data.map(item => item.name);
                setLeaveOptions(types);
            } catch (error) {
                console.error('Error fetching leave types:', error);
                alert('Failed to fetch leave types');
            } finally {
                setLoading(false);
            }
        };
        fetchLeaveTypes();
    }, []);

    const handleSubmitLeave = async () => {
        if (!leaveType || !reason) {
            alert('Please fill all fields');
            return;
        }
        try {
            setLoading(true);
            const payload = {
                employee: 'HR-EMP-00002',
                leave_type: leaveType,
                from_date: dates.from.toISOString().split('T')[0],
                to_date: dates.to.toISOString().split('T')[0],
                description: reason,
                company: 'Impetors Pvt Ltd',
            };
            const response = await axios.post(`${ERP_URL_RESOURCE}/Leave Application`, payload, {
                headers: {
                    Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}`,
                    'Content-Type': 'application/json',
                },
            });
            console.log("response====>", response);
            if (response.status === 200 || response.status === 201) {
                alert('Leave applied successfully!');
                setModalVisible(false);
                setReason('');
                setLeaveType('');
                fetchLeaveHistory();
            }
        } catch (error) {
            console.error('Error applying leave:', error.response?.data || error);
            alert('Failed to apply leave. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaveHistory = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${ERP_URL_RESOURCE}/Leave Application`, {
                headers: {
                    Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}`,
                },
                params: {
                    fields: '["name","leave_type","from_date","to_date","status","description","employee"]',
                    filters: JSON.stringify({ employee: "HR-EMP-00002" })
                }
            });
            console.log("ERPNext Leave Application Response:", response.data);
            const history = response.data.data.map((item: any) => ({
                id: item.name,
                type: item.leave_type,
                from: item.from_date,
                to: item.to_date,
                status: item.status,
                reason: item.description || "No reason provided",
            }));
            setLeaveRequests(history);
        } catch (error) {
            console.error("Error fetching leave history:", error);
            alert("Failed to fetch leave history.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaveHistory();
    }, []);

    //leave balance progressbar
    const fetchLeaveBalances = async () => {
        try {
            setLoading(true);
            const leaveTypesRes = await axios.get(`${ERP_URL_RESOURCE}/Leave Type`, {
                headers: { Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}` },
            });
            const leaveTypes = leaveTypesRes.data.data.map((lt: any) => lt.name);
            console.log("leaveTypes====>", leaveTypes);
            const balances: any[] = [];
            for (const type of leaveTypes) {
                const allocationRes = await axios.get(`${ERP_URL_RESOURCE}/Leave Allocation`, {
                    headers: { Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}` },
                    params: {
                        fields: JSON.stringify(["total_leaves_allocated"]),
                        filters: JSON.stringify([
                            ["employee", "=", "HR-EMP-00002"],
                            ["leave_type", "=", type],
                        ]),
                    },
                });
                let total = 0;
                if (allocationRes.data.data.length > 0) {
                    total = allocationRes.data.data.reduce(
                        (sum: number, item: any) => sum + item.total_leaves_allocated,
                        0
                    );
                }
                const usedRes = await axios.get(`${ERP_URL_RESOURCE}/Leave Application`, {
                    headers: { Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}` },
                    params: {
                        fields: JSON.stringify(["total_leave_days"]),
                        filters: JSON.stringify([
                            ["employee", "=", "HR-EMP-00002"],
                            ["leave_type", "=", type],
                            ["status", "=", "Approved"],
                        ]),
                    },
                });
                let used = 0;
                if (usedRes.data.data.length > 0) {
                    used = usedRes.data.data.reduce(
                        (sum: number, item: any) => sum + item.total_leave_days,
                        0
                    );
                }
                balances.push({ type, used, total });
            }
            console.log("Final Leave Balances ===>", balances);
            setLeaveBalances(balances);
        } catch (error: any) {
            console.error("Error fetching leave balances:", error?.response?.data || error.message);
            alert("Failed to fetch leave balances");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaveBalances();
    }, []);

    return (
        <View style={styles.container}>
            <CustomHeader
                title="Leave"
                showBackButton
                onBackPress={() => navigation.goBack()}
                rightComponent={<Ionicons name="notifications-outline" size={24} color="#fff" />}
                backgroundColor="black"
            />
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>Leave Balance</Text>
                {leaveOptions.length > 0 ? (
                    leaveOptions.map((type, index) => (
                        <View key={index} style={styles.leaveCard}>
                            <View style={styles.leaveHeader}>
                                <Text style={styles.leaveType}>{type}</Text>
                                <Text style={styles.leaveCount}>0/0</Text>
                            </View>
                            <View style={styles.progressBarBackground}>
                                <View style={[styles.progressBarFill, { width: '0%' }]} />
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={{ color: 'gray', textAlign: 'center', marginVertical: 10 }}>
                        Loading leave types...
                    </Text>
                )}
                <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.applyButtonText}>Apply for Leave</Text>
                </TouchableOpacity>

                <Text style={{ marginTop: 10, paddingBottom: 10, fontSize: 18, fontWeight: '700', }}>Leave Requests</Text>

                {leaveRequests.length === 0 ? (
                    <View style={styles.noRequestsContainer}>
                        <Ionicons name="calendar-outline" size={80} color="#ccc" style={{ marginBottom: 10 }} />
                        <Text style={styles.noRequestsText}>No leave requests exist</Text>
                    </View>
                ) : (
                    <FlatList
                        data={leaveRequests}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.requestCard}>
                                <View style={styles.typeRow}>
                                    <Text style={styles.requestType}>{item.type}</Text>
                                    <Text
                                        style={[
                                            styles.requestStatus,
                                            item.status === 'Approved'
                                                ? { color: 'green' }
                                                : item.status === 'Pending'
                                                    ? { color: 'orange' }
                                                    : { color: 'red' },
                                        ]}
                                    >
                                        {item.status}
                                    </Text>
                                </View>
                                <Text style={styles.requestReason}>{item.reason}</Text>
                                <View style={styles.dateRow}>
                                    <Ionicons name="calendar-outline" size={16} color="#555" style={{ marginRight: 6 }} />
                                    <Text style={styles.requestDate}>
                                        {item.from} → {item.to}
                                    </Text>
                                </View>
                            </View>
                        )}
                        scrollEnabled={false}
                    />
                )}
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Apply for Leave</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#000" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.modalSubtitle}>
                                Fill in the details below to submit your leave request.
                            </Text>
                            <Text style={styles.label}>Leave Type</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setShowDropdown(!showDropdown)}
                            >
                                <Text>{leaveType}</Text>
                                <Ionicons
                                    name={showDropdown ? 'chevron-up' : 'chevron-down'}
                                    size={18}
                                    color="#000"
                                    style={{ position: 'absolute', right: 10, top: 10 }}
                                />
                            </TouchableOpacity>
                            {showDropdown && (
                                <View style={styles.dropdown}>
                                    {leaveOptions.map((option, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setLeaveType(option);
                                                setShowDropdown(false);
                                            }}
                                        >
                                            <Text style={styles.dropdownText}>{option}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            <Text style={styles.label}>From Date</Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker({ ...showPicker, from: true })}
                                style={styles.input}
                            >
                                <Text>{dates.from.toDateString()}</Text>
                            </TouchableOpacity>
                            {showPicker.from && (
                                <DateTimePicker
                                    value={dates.from}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    minimumDate={new Date()}
                                    onChange={(_, selectedDate) => {
                                        setShowPicker({ ...showPicker, from: Platform.OS === 'ios' });
                                        if (selectedDate) setDates({ ...dates, from: selectedDate });
                                    }}
                                />
                            )}
                            <Text style={styles.label}>To Date</Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker({ ...showPicker, to: true })}
                                style={styles.input}
                            >
                                <Text>{dates.to.toDateString()}</Text>
                            </TouchableOpacity>
                            {showPicker.to && (
                                <DateTimePicker
                                    value={dates.to}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    minimumDate={dates.from}
                                    onChange={(_, selectedDate) => {
                                        setShowPicker({ ...showPicker, to: Platform.OS === 'ios' });
                                        if (selectedDate) setDates({ ...dates, to: selectedDate });
                                    }}
                                />
                            )}
                            <Text style={styles.label}>Reason</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                multiline
                                value={reason}
                                onChangeText={setReason}
                                placeholder="Enter reason for leave"
                            />

                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleSubmitLeave}
                            >
                                <Text style={styles.submitButtonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </View>
    );
};

export default LeaveScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 16, backgroundColor: '#fff' },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#000' },
    leaveCard: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
    },
    leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    leaveType: { fontSize: 16, fontWeight: '600' },
    leaveCount: { fontSize: 14, color: '#555' },
    progressBarBackground: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5 },
    progressBarFill: { height: 10, backgroundColor: 'black', borderRadius: 5 },
    applyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'black',
        paddingVertical: 12,
        borderRadius: 8,
    },
    applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '90%', backgroundColor: '#fff', borderRadius: 10, padding: 20 },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    label: { marginTop: 10, fontWeight: '600', color: '#333' },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginTop: 5,
    },
    submitButton: {
        marginTop: 20,
        backgroundColor: 'black',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    closeButton: {
        marginTop: 10,
        backgroundColor: '#888',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#555',
        marginBottom: 16,
    },
    dropdown: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginTop: 5,
        backgroundColor: '#fff',
    },
    dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    dropdownText: { fontSize: 14, color: '#333' },
    //leave request flatlist style
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        borderWidth: 0.6,
        borderColor: '#d3d3d3',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    typeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    requestReason: {
        fontSize: 14,
        color: '#555',
        marginTop: 4,
        fontStyle: 'italic',
    },
    requestRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    requestType: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    requestStatus: {
        fontSize: 14,
        fontWeight: '600',
    },
    requestDate: {
        fontSize: 14,
        color: '#555',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    statusRow: {
        alignItems: 'flex-end',
        marginTop: 8,
    },
    noRequestsContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 30,
    },
    noRequestsImage: {
        width: 150,
        height: 150,
        marginBottom: 10,
    },
    noRequestsText: {
        fontSize: 16,
        color: '#555',
        fontWeight: '500',
    },

});
