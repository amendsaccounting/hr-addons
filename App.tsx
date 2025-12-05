import * as React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import RootErrorBoundary from './src/components/RootErrorBoundary';
import { NavigationContainer } from '@react-navigation/native';

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    // <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <SafeAreaProvider>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <RootNavigator />
          </SafeAreaProvider>
        </NavigationContainer>
      </GestureHandlerRootView>
    // </RootErrorBoundary>
  );
}
