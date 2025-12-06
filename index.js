/**
 * @format
 */
// Must be first: required by React Navigation for gestures
import 'react-native-gesture-handler';
// Ensure Reanimated is initialized before other imports
import 'react-native-reanimated';
// Optimize memory and performance for navigation stacks
import { enableScreens } from 'react-native-screens';
enableScreens(true);

import { AppRegistry } from 'react-native';
// React 19 compatibility for libs expecting `react.default`
try {
  // Deliberately import after native shims, before App
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  if (React && !('default' in React)) {
    React.default = React;
  }
  const RN = require('react-native');
  if (RN && !('default' in RN)) {
    RN.default = RN;
  }
} catch {}
import App from './App';
import { name as appName } from './app.json';
AppRegistry.registerComponent(appName, () => App);
