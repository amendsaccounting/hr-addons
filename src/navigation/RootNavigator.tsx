import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import SplashScreen from '../screens/SplashScreen';
import TabNavigator, { TabName } from './TabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
let AsyncStorage: any = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import { addLogoutListener } from '../services/session';

export default function RootNavigator() {
  // const [stage, setStage] = useState<'splash' | 'lock' | 'login' | 'register' | 'tabs'>('splash');
  const [stage, setStage] = useState<'splash' | 'lock' | 'onboarding' | 'login' | 'register' | 'tabs'>('splash');
  const [initialTab, setInitialTab] = useState<TabName>('HomeScreen');
  const nextAfterLockRef = useRef<'login' | 'tabs'>('login');
  const unlockedRef = useRef<boolean>(false);
  const appState = useRef(AppState.currentState);
  const stageRef = useRef(stage);
  useEffect(() => { stageRef.current = stage; try { console.log('[root] stage →', stage); } catch {} }, [stage]);

  useEffect(() => {
    const t = setTimeout(() => { if (stage === 'splash') setStage('login'); }, 2800);
    return () => clearTimeout(t);
  }, [stage]);

  // Listen for global logout requests
  useEffect(() => {
    const off = addLogoutListener(() => {
      try { console.log('[root] received logout request; navigating to login'); } catch {}
      setStage('login');
    });
    return () => { try { off(); } catch {} };
  }, []);

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
        try {
          const pin = await AsyncStorage.getItem('app_lock_pin');
          if (pin) { unlockedRef.current = false; setStage('lock'); }
        } catch {}
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => { sub.remove(); };
  }, []);

  // Watchdog: if we remain on 'lock' for too long, auto-advance
  useEffect(() => {
    if (stage !== 'lock') return;
    const id = setTimeout(() => {
      try { console.log('[root] lock watchdog firing →', nextAfterLockRef.current); } catch {}
      setStage(nextAfterLockRef.current);
    }, 2000);
    return () => clearTimeout(id);
  }, [stage]);

  if (stage === 'splash') {
    return (
      <SplashScreen
        onFinish={(tab) => { setInitialTab(tab === 'Dashboard' ? 'HomeScreen' as TabName : 'HomeScreen' as TabName); handleSplashFinish(tab); }}
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
        onSignedIn={() => { setInitialTab('HomeScreen' as TabName); setStage('tabs'); }}
        onRegister={() => { setStage('register'); }}
      />
    );
  }

  if (stage === 'register') {
    return (
      <RegisterScreen
        onLogin={() => setStage('login')}
        onRegistered={() => { setInitialTab('HomeScreen' as TabName); setStage('tabs'); }}
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
