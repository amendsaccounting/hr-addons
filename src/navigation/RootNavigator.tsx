import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import SplashScreen from '../screens/SplashScreen';
import TabNavigator, { TabName } from './TabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AppLockScreen from '../screens/AppLockScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

export default function RootNavigator() {
  // const [stage, setStage] = useState<'splash' | 'lock' | 'login' | 'register' | 'tabs'>('splash');
  const [stage, setStage] = useState<'splash' | 'lock' | 'onboarding' | 'login' | 'register' | 'tabs'>('splash');
  const [initialTab, setInitialTab] = useState<TabName>('Dashboard');
  const nextAfterLockRef = useRef<'login' | 'tabs'>('login');
  const unlockedRef = useRef<boolean>(false);
  const appState = useRef(AppState.currentState);

  // Show splash until navigation is explicitly triggered; no auto-advance

  const handleSplashFinish = async (tab: 'Dashboard' | 'Login') => {
    nextAfterLockRef.current = tab === 'Dashboard' ? 'tabs' : 'login';
    setStage('lock');
  };

//   const handleSplashFinish = async () => {
//   try {
//     const userEmail = await AsyncStorage.getItem('userEmail');
//     if (!userEmail) {
//       setStage('onboarding');
//       return;
//     }
//     nextAfterLockRef.current = 'tabs';
//     setStage('lock');
//   } catch (err) {
//     console.log('AsyncStorage error:', err);
//     setStage('login');
//   }
// };

  // Lock the app on returning to foreground if a PIN exists
  useEffect(() => {
    const onChange = async (nextState: AppStateStatus) => {
      const prevState = appState.current;
      appState.current = nextState;
      if (prevState.match(/inactive|background/) && nextState === 'active') {
        // While on splash, do not trigger lock routing
        if (stage === 'splash') return;
        try {
          const pin = await AsyncStorage.getItem('app_lock_pin');
          if (pin) { unlockedRef.current = false; setStage('lock'); }
        } catch {}
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => { sub.remove(); };
  }, [stage]);

  if (stage === 'splash') {
    return (
      <SplashScreen />
    );
  }

  if (stage === 'lock') {
    return (
      <AppLockScreen
        onUnlocked={() => {
          unlockedRef.current = true;
          setStage(nextAfterLockRef.current);
        }}
      />
    );
  }

  if (stage === 'login') {
    return (
      <LoginScreen
        onSignedIn={() => { setInitialTab('Dashboard'); setStage('tabs'); }}
        onRegister={() => { setStage('register'); }}
      />
    );
  }

  if (stage === 'register') {
    return (
      <RegisterScreen
        onLogin={() => setStage('login')}
        onRegistered={() => { setInitialTab('Dashboard'); setStage('tabs'); }}
      />
    );
  }

  if (stage === 'onboarding') {
  return (
    <OnboardingScreen
      onContinue={() => setStage('login')} // After completing onboarding, go to login
    />
  );
}


  return <TabNavigator initialTab={initialTab} />;
}
