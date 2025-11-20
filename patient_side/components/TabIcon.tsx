import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

const TabIcon = ({ focused, iconName }: any) => {
  return (
    <View className="flex-row items-center justify-center">
      <Ionicons
        name={iconName}
        size={24}
        color={focused ? '#fff' : '#A8B5DB'} // Change icon color based on focus
      />
    </View>
  );
};

export default TabIcon;
