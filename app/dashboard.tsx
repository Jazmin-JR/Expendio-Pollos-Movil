import DashboardCard from '@/components/DashboardCard';
import { createDrawerNavigator } from '@react-navigation/drawer';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
    ArchiveBoxIcon,
    BellAlertIcon,
    ChartBarIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    TruckIcon
} from 'react-native-heroicons/outline';

const Drawer = createDrawerNavigator();

const fechaActual = new Date().toLocaleDateString('es-MX', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.welcome}>¡Bienvenido!</Text>
      <Text style={styles.date}>{fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1)}</Text>

      {/* Cards */}
      <DashboardCard title="Productos en Stock" value="0" subtitle="0 con stock bajo" icon={<ArchiveBoxIcon size={32} color="#f59e0b" />} />
      <DashboardCard title="Rutas de Hoy" value="0" subtitle="0 completadas" icon={<TruckIcon size={32} color="#f59e0b" />} />
      <DashboardCard title="Ventas de Hoy" value="0" subtitle="0 completadas" icon={<ChartBarIcon size={32} color="#f59e0b" />} />
      <DashboardCard title="Total del Día" value="0" subtitle="0 completadas" icon={<CurrencyDollarIcon size={32} color="#f59e0b" />} />

      {/* Secciones */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <BellAlertIcon size={22} color="#f59e0b" />
          <Text style={styles.sectionTitle}>Alertas de Stock</Text>
        </View>
        <Text style={styles.alertText}>No hay productos con stock bajo</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <TruckIcon size={22} color="#f59e0b" />
          <Text style={styles.sectionTitle}>Rutas Activas</Text>
        </View>
        <Text style={styles.alertText}>No hay rutas activas</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ExclamationTriangleIcon size={22} color="#f59e0b" />
          <Text style={styles.sectionTitle}>Alertas de Ventas</Text>
        </View>
        <Text style={styles.alertText}>No hay ventas registradas</Text>
      </View>
    </ScrollView>
  );
}

function PedidosScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Pedidos</Text>
      <Text>Lista de pedidos disponibles</Text>
    </View>
  );
}

function SucursalesScreen() {
  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenTitle}>Sucursales</Text>
      <Text>Aquí puedes ver las sucursales registradas</Text>
    </View>
  );
}

export default function Dashboard() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' }, // Blanco
        headerTintColor: '#000', // Texto e ícono negro
        headerTitle: '',
        headerRight: () => (
          <Image
            source={require('@/assets/logo-nuevo.png')}
            style={{ width: 40, height: 40, marginRight: 15 }}
          />
        ),
        drawerActiveBackgroundColor: '#fde68a',
        drawerActiveTintColor: '#000',
        drawerInactiveTintColor: '#555',
        drawerLabelStyle: { fontSize: 15 },
      }}
    >
      <Drawer.Screen name="Inicio" component={HomeScreen} />
      <Drawer.Screen name="Pedidos" component={PedidosScreen} />
      <Drawer.Screen name="Sucursales" component={SucursalesScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f6f2ff',
    paddingHorizontal: 16,
  },
  welcome: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
  },
  date: {
    color: '#777',
    marginBottom: 20,
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#222',
  },
  alertText: {
    color: '#999',
    textAlign: 'center',
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 10,
  },
});
