import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { useRouter } from 'expo-router';

const trackingButton = ({ label, emoji, onPress }) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      className="items-center"
      onPress={onPress}
    >
      <Text className="text-3xl">{emoji}</Text>
      <Text className="mt-1 font-semibold text-sm">{label}</Text>
    </TouchableOpacity>
  );
};

export default trackingButton;
