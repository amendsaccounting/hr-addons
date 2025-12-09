/**
 * @format
 */
// Interop shim must come before any RN-related imports
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  if (React && !('default' in React)) React.default = React;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RN = require('react-native');
  if (RN && !('default' in RN)) RN.default = RN;
} catch {}

// Must be first: required by React Navigation for gestures
import 'react-native-gesture-handler';
// Ensure Reanimated is initialized before other imports
// import 'react-native-reanimated';
// Optimize memory and performance for navigation stacks
import { enableScreens } from 'react-native-screens';
enableScreens(true);

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
AppRegistry.registerComponent(appName, () => App);
