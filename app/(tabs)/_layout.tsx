import React from 'react';
import { Tabs } from 'expo-router';
import TabIcon from '@/components/TabIcon'; // Make sure to adjust the import path as needed

const _layout = () => {
  return (
    <Tabs
    screenOptions ={{
      tabBarItemStyle: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabBarStyle:{
      backgroundColor: '#067425',
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      height: 70,
      position: 'absolute',
      overflow: 'hidden',
      borderColor: '#008080'
  },
  tabBarLabelStyle: {
    color: "#fff", // Change label color to white
  },
}}>
      <Tabs.Screen
        name="dashboard"
        options={{
          headerShown: true,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="home" />
          ),
          tabBarLabel: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          headerShown: true,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="notifications" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          headerShown: true,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="person" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: true,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="settings" />
          ),
        }}
      />
    </Tabs>
  );
};

export default _layout;
