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
import App from './App';
import { name as appName } from './app.json';
AppRegistry.registerComponent(appName, () => App);
