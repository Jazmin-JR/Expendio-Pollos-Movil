import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onClose: () => void;
};

export default function SidebarMenu({ onClose }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menú</Text>
      <TouchableOpacity style={styles.item}>
        <Text style={styles.text}>Pedidos</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item}>
        <Text style={styles.text}>Sucursales</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item}>
        <Text style={styles.text}>Productos</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  item: {
    paddingVertical: 12,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    marginTop: 20,
  },
  closeText: {
    color: '#f59e0b',
    fontWeight: 'bold',
  },
});
