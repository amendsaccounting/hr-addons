import { View, Text, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert } from 'react-native'
import React, { useState, useCallback, memo, useRef } from 'react'
import { Ionicons } from '@expo/vector-icons'
import CustomInput from '../components/CustomInput';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ERP_APIKEY, ERP_SECRET, ERP_URL_RESOURCE } from '@env';

const { height: screenHeight } = Dimensions.get('window');

const BottomSection = memo(({ onRegister }) => (
    <View style={styles.bottomContainer}>
        <Text style={styles.bottomText}>Don't have an account? </Text>
        <TouchableOpacity onPress={onRegister} activeOpacity={0.7}>
            <Text style={styles.registerText}>Register</Text>
        </TouchableOpacity>
    </View>
));

const erpAxios = axios.create({
    baseURL: ERP_URL_RESOURCE,
    headers: { Authorization: `token ${ERP_APIKEY}:${ERP_SECRET}` }
});

const LoginScreen = () => {
    const navigation = useNavigation()
    const scrollViewRef = useRef(null)
    const usernameInputRef = useRef(null)
    const [formData, setFormData] = useState({
        username: '',
        rememberMe: false
    });

        const updateFormField = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleRegister = useCallback(() => {
        navigation.navigate("Register")
    }, []);

    const handleForgotPassword = useCallback(() => {
        console.log('Navigate to forgot password');
    }, []);

    const handleFaceAttendance = useCallback(() => {
        console.log('Mark attendance with face');
    }, []);

    // Helper function to toggle rememberMe
    const toggleRememberMe = useCallback(() => {
        setFormData(prev => ({ ...prev, rememberMe: !prev.rememberMe }));
    }, []);


    // Handle input focus with better scrolling
    const handleInputFocus = useCallback(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 50, animated: true });
        }, 100);
    }, []);

    // Handle keyboard return key
    const handleUsernameSubmit = useCallback(() => {
        handleSignIn();
    }, [handleSignIn]);


   const handleSignIn = useCallback(async () => {
    const { username } = formData;
    if (!username) {
        Alert.alert('Error', 'Please enter your email');
        return;
    }
    try {
        const userResponse = await erpAxios.get('/User', {
            params: { filters: JSON.stringify([["email", "=", username]]) }
        });
        console.log('userResponse:====>', userResponse);
        if (userResponse.data.data.length === 0) {
            Alert.alert('Error', 'User not found');
            return;
        }
        const user = userResponse.data.data[0];
        console.log('User:====>', user);
        // 2. Get Employee linked to this user
        const employeeResponse = await erpAxios.get('/Employee', {
            params: { filters: JSON.stringify([["user_id", "=", username]]) }
        });
        if (employeeResponse.data.data.length === 0) {
            Alert.alert('Error', 'Employee record not found');
            return;
        }
        const employee = employeeResponse.data.data[0];
        console.log('Employee:===>', employee);
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        await AsyncStorage.setItem('employeeData', JSON.stringify(employee));
        console.log('User and Employee stored in AsyncStorage');
        Alert.alert('Success', `Welcome ${employee.employee_name || employee.name}`);
        navigation.replace('Dashboard');

    } catch (error) {
        console.log('ERPNext API error:', error.response?.data || error.message);
        Alert.alert('Error', 'Something went wrong while fetching data');
    }
}, [formData.username, navigation]);

    return (
        <View style={styles.container}>
            <View style={styles.headerSection}>
                <View style={styles.logoContainer}>
                    <View style={styles.hrLogoBox}>
                        <Ionicons name="business-outline" size={36} color="#030213" />
                    </View>
                    <Text style={styles.appName}>ERPNext HR</Text>
                    <Text style={styles.subtitle}>Sign in to your account</Text>
                </View>
            </View>
            
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="interactive"
                >
                    <View style={styles.whiteContainer}>
                        <View style={styles.formContainer}>
                            <View style={styles.fieldContainer}>
                                <Text style={styles.label}>Username</Text>
                                <CustomInput
                                    ref={usernameInputRef}
                                    type="text"
                                    placeholder="Enter your username"
                                    value={formData.username}
                                    onChangeText={(value) => updateFormField('username', value)}
                                    iconName="person-outline"
                                    onFocus={handleInputFocus}
                                    returnKeyType="go"
                                    onSubmitEditing={handleUsernameSubmit}
                                />
                                
                                <View style={styles.optionsRow}>
                                    <TouchableOpacity
                                        style={styles.rememberMeContainer}
                                        onPress={toggleRememberMe}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={formData.rememberMe ? "checkbox" : "square-outline"}
                                            size={20}
                                            color="#030213"
                                        />
                                        <Text style={styles.rememberMeText}>Remember Me</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleForgotPassword}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            
                            <TouchableOpacity
                                style={styles.signInButton}
                                onPress={handleSignIn}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.signInButtonText}>Sign In</Text>
                            </TouchableOpacity>
                            
                            <View style={styles.orContainer}>
                                <View style={styles.line} />
                                <Text style={styles.orText}>OR</Text>
                                <View style={styles.line} />
                            </View>
                            
                            <TouchableOpacity
                                style={styles.faceButton}
                                onPress={handleFaceAttendance}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="camera-outline" size={20} color="#030213" style={{ marginRight: 8 }} />
                                <Text style={styles.faceButtonText}>Mark Attendance with Face</Text>
                            </TouchableOpacity>
                        </View>

                        <BottomSection onRegister={handleRegister} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030213',
    },
    headerSection: {
        height: 300,
        backgroundColor: '#030213',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 20,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    logoContainer: {
        alignItems: 'center',
    },
    hrLogoBox: {
        width: 70,
        height: 70,
        backgroundColor: '#fff',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '400',
    },
    whiteContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 30,
        paddingHorizontal: 20,
        paddingBottom: 40,
        minHeight: screenHeight * 0.65,
        flexGrow: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    formContainer: {
        flex: 1,
    },
    fieldContainer: {
        marginBottom: 0,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    signInButton: {
        backgroundColor: '#030213',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    signInButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#ccc',
        marginHorizontal: 10,
    },
    orText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    faceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#030213',
        padding: 14,
        borderRadius: 8,
    },
    faceButtonText: {
        fontSize: 16,
        color: '#030213',
        fontWeight: '600',
    },
    bottomContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: 20,
        paddingBottom: 10,
    },
    bottomText: {
        fontSize: 14,
        color: '#666',
    },
    registerText: {
        fontSize: 14,
        color: '#030213',
        fontWeight: '600',
    },
    forgotPasswordText: {
        fontSize: 16,
        color: '#030213',
        fontWeight: '600',
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rememberMeText: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
    },
});

export default LoginScreen;

                //   <View style={[styles.fieldContainer, styles.passwordContainer]}>
                //                 <Text style={styles.label}>Password</Text>
                //                 <CustomInput
                //                     ref={passwordInputRef}
                //                     type="password"
                //                     placeholder="Enter your password"
                //                     value={formData.password}
                //                     onChangeText={(value) => updateFormField('password', value)}
                //                     iconName="lock-closed-outline"
                //                     onFocus={() => handleInputFocus('password')}
                //                     returnKeyType="go"
                //                     onSubmitEditing={handlePasswordSubmit}
                //                 />
                //                 <View style={styles.optionsRow}>
                //                     <TouchableOpacity
                //                         style={styles.rememberMeContainer}
                //                         onPress={toggleRememberMe}
                //                         activeOpacity={0.7}
                //                     >
                //                         <Ionicons
                //                             name={formData.rememberMe ? "checkbox" : "square-outline"}
                //                             size={20}
                //                             color="#030213"
                //                         />
                //                         <Text style={styles.rememberMeText}>Remember Me</Text>
                //                     </TouchableOpacity>

                //                     <TouchableOpacity
                //                         onPress={handleForgotPassword}
                //                         activeOpacity={0.7}
                //                     >
                //                         <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                //                     </TouchableOpacity>
                //                 </View>
                //             </View>