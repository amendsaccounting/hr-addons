// components/CustomInput.js
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CustomInput = ({
    type,
    placeholder,
    value,
    onChangeText,
    onBlur,
    iconName,
    keyboardType,
    autoCapitalize = 'sentences',
    error,
    ...props
}) => {
    return (
        <View>
            <View style={[
                styles.inputContainer,
                error && styles.inputError
            ]}>
                <Ionicons name={iconName} size={20} color="#666" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    onBlur={onBlur}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    secureTextEntry={type === 'password'}
                    placeholderTextColor="#999"
                    {...props}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f9f9f9',
        height: 50,
    },
    inputError: {
        borderColor: '#ff3b30',
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
});

export default CustomInput;