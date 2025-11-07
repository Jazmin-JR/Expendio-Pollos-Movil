import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const fechaActual = new Date().toLocaleDateString('es-MX', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="home" size={32} color="#f59e0b" />
        <Text style={styles.title}>Inicio</Text>
      </View>
      <ScrollView style={styles.content}>
        <Text style={styles.welcome}>¡Bienvenido!</Text>
        <Text style={styles.date}>{fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1)}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen del Día</Text>
          <Text style={styles.cardText}>Aquí se mostrará el resumen de actividades del día</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Accesos Rápidos</Text>
          <View style={styles.quickAccess}>
            <View style={styles.quickAccessItem}>
              <Ionicons name="cube" size={24} color="#f59e0b" />
              <Text style={styles.quickAccessText}>Productos</Text>
            </View>
            <View style={styles.quickAccessItem}>
              <Ionicons name="construct" size={24} color="#f59e0b" />
              <Text style={styles.quickAccessText}>Producción</Text>
            </View>
            <View style={styles.quickAccessItem}>
              <Ionicons name="car" size={24} color="#f59e0b" />
              <Text style={styles.quickAccessText}>Repartos</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f6f2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  welcome: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    color: '#111',
  },
  date: {
    color: '#777',
    marginBottom: 20,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#222',
  },
  cardText: {
    fontSize: 14,
    color: '#666',
  },
  quickAccess: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  quickAccessItem: {
    alignItems: 'center',
    gap: 8,
  },
  quickAccessText: {
    fontSize: 12,
    color: '#666',
  },
});
