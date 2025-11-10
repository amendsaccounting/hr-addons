import React, { useEffect, useState } from 'react';
import SplashScreen from '../screens/SplashScreen';
import TabNavigator, { TabName } from './TabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

export default function RootNavigator() {
  const [stage, setStage] = useState<'splash' | 'login' | 'register' | 'tabs'>('splash');
  const [initialTab, setInitialTab] = useState<TabName>('Dashboard');

  useEffect(() => {
    const t = setTimeout(() => { if (stage === 'splash') setStage('login'); }, 2800);
    return () => clearTimeout(t);
  }, [stage]);

  if (stage === 'splash') {
    return (
      <SplashScreen
        onFinish={(tab) => {
          if (tab === 'Dashboard') { setInitialTab('Dashboard'); setStage('tabs'); }
          else { setStage('login'); }
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
      <RegisterScreen />
    );
  }

  return <TabNavigator initialTab={initialTab} />;
}
