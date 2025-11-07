import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e5e5e5',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size || 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="productos"
        options={{
          title: 'Productos',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube" size={size || 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="produccion"
        options={{
          title: 'Producción',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size || 24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="repartos"
        options={{
          title: 'Repartos',
          tabBarIcon: ({ color, size }) => <Ionicons name="car" size={size || 24} color={color} />,
        }}
      />
    </Tabs>
  );
}
