import React, { useEffect, useState } from 'react';
import SplashScreen from '../screens/SplashScreen';
import TabNavigator, { TabName } from './TabNavigator';
import LoginScreen from '../screens/auth/LoginScreen';

export default function RootNavigator() {
  const [stage, setStage] = useState<'splash' | 'login' | 'tabs'>('splash');
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
          else { setInitialTab('Register'); setStage('login'); }
        }}
      />
    );
  }

  if (stage === 'login') {
    return (
      <LoginScreen
        onSignedIn={() => { setInitialTab('Dashboard'); setStage('tabs'); }}
        onRegister={() => { setInitialTab('Register'); setStage('tabs'); }}
      />
    );
  }

  return <TabNavigator initialTab={initialTab} />;
}
