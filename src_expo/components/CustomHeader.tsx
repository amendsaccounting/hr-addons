import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform, DimensionValue } from 'react-native'
import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

interface CustomHeaderProps {
    title?: string;
    onBackPress?: () => void;
    showBackButton?: boolean;
    rightComponent?: React.ReactNode;
    leftComponent?: React.ReactNode; // New prop for left section
    centerComponent?: React.ReactNode; // New prop for center section
    backgroundColor?: string;
    titleColor?: string;
    elevation?: number;
    height?: DimensionValue;
    contentHeight?: number;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
    title = "Header Title",
    onBackPress,
    showBackButton = false,
    rightComponent,
    leftComponent, // Custom left component
    centerComponent, // Custom center component
    backgroundColor = '#000',
    titleColor = '#fff',
    elevation = 2,
    height,
    contentHeight = 56
}) => {

    const insets = useSafeAreaInsets();
    const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : insets.top;
    const totalHeight = height || contentHeight + statusBarHeight;

    // Default left content (back button)
    const defaultLeftContent = showBackButton && onBackPress ? (
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={titleColor} />
        </TouchableOpacity>
    ) : null;

    // Default center content (title)
    const defaultCenterContent = (
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
        </Text>
    );

    return (
        <View style={{ backgroundColor }}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={backgroundColor}
                translucent={false}
            />
            <SafeAreaView edges={['top']} style={{ backgroundColor }}>
                <View style={[
                    styles.headerContainer,
                    {
                        backgroundColor,
                        height: contentHeight,
                        ...(elevation > 0 && styles.shadow)
                    }
                ]}>
                    <View style={styles.leftSection}>
                        {leftComponent || defaultLeftContent}
                    </View>
                    <View style={styles.centerSection}>
                        {centerComponent || defaultCenterContent}
                    </View>
                    <View style={styles.rightSection}>
                        {rightComponent}
                    </View>
                </View>
            </SafeAreaView>
        </View>
    )
}

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    leftSection: {
        flex: 1,
        alignItems: 'flex-start',
    },
    centerSection: {
        flex: 2,
        alignItems: 'center',
    },
    rightSection: {
        flex: 1,
        alignItems: 'flex-end',
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    }
})

export default CustomHeader