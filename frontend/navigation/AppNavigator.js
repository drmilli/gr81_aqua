import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Onboarding  from '../screens/Onboarding';
import Login       from '../screens/Login';
import Paywall     from '../screens/Paywall';
import Home        from '../screens/Home';
import TV          from '../screens/TV';
import Movies      from '../screens/Movies';
import Series      from '../screens/Series';
import Search      from '../screens/Search';
import Settings    from '../screens/Settings';
import Playlist    from '../screens/Playlist';
import MyList      from '../screens/MyList';
import MovieDetail from '../screens/MovieDetail';
import PlayScreen  from '../screens/PlayScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName={Platform.isTV ? 'TV' : 'Home'}
      tabBar={() => null}
      sceneContainerStyle={{ flex: 1, paddingBottom: 0 }}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home"   component={Home} />
      <Tab.Screen name="TV"     component={TV} />
      <Tab.Screen name="Movies" component={Movies} />
      <Tab.Screen name="Series" component={Series} />
      <Tab.Screen name="Search" component={Search} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: '#060e1a' },
        gestureEnabled: !Platform.isTV,
      }}
    >
      {/* Auth flow */}
      <Stack.Screen name="Onboarding" component={Onboarding} />
      <Stack.Screen name="Paywall"    component={Paywall} />
      <Stack.Screen name="Login"      component={Login} />

      {/* Main tabbed content */}
      <Stack.Screen name="Main" component={Tabs} />

      {/* Detail / overlay screens */}
      <Stack.Screen name="MovieDetail" component={MovieDetail} />
      <Stack.Screen name="Play"        component={PlayScreen} />

      {/* Settings & management — accessible from any screen */}
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="Playlist" component={Playlist} />
      <Stack.Screen name="MyList"   component={MyList} />
    </Stack.Navigator>
  );
}
