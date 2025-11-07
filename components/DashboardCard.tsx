import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
};

export default function DashboardCard({ title, value, subtitle, icon }: any) {
  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  left: {
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#888',
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 13,
    color: '#555',
  },
});
