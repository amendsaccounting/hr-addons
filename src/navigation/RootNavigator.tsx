import React, { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import SplashScreen from '../screens/SplashScreen';
import TabNavigator, { TabName } from './TabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AppLockScreen from '../screens/AppLockScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootNavigator() {
  const [stage, setStage] = useState<'splash' | 'lock' | 'login' | 'register' | 'tabs'>('splash');
  const [initialTab, setInitialTab] = useState<TabName>('Dashboard');
  const nextAfterLockRef = useRef<'login' | 'tabs'>('login');
  const unlockedRef = useRef<boolean>(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const t = setTimeout(() => { if (stage === 'splash') setStage('login'); }, 2800);
    return () => clearTimeout(t);
  }, [stage]);

  // On splash finish, decide next route and insert lock stage first
  const handleSplashFinish = async (tab: 'Dashboard' | 'Login') => {
    nextAfterLockRef.current = tab === 'Dashboard' ? 'tabs' : 'login';
    // Always show App Lock first; it will be in setup mode if no PIN exists
    setStage('lock');
  };

  // Lock the app on returning to foreground if a PIN exists
  useEffect(() => {
    const onChange = async (nextState: AppStateStatus) => {
      const prevState = appState.current;
      appState.current = nextState;
      if (prevState.match(/inactive|background/) && nextState === 'active') {
        try {
          const pin = await AsyncStorage.getItem('app_lock_pin');
          if (pin) { unlockedRef.current = false; setStage('lock'); }
        } catch {}
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => { sub.remove(); };
  }, []);

  if (stage === 'splash') {
    return (
      <SplashScreen
        onFinish={(tab) => { setInitialTab(tab === 'Dashboard' ? 'Dashboard' : 'Dashboard'); handleSplashFinish(tab); }}
      />
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

  return <TabNavigator initialTab={initialTab} />;
}
