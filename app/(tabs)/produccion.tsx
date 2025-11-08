import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AddProductionModal from '@/components/AddProductionModal';
import { API_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Produccion {
  id_produccion: number;
  produccion_kg: number;
  total: number;
  devolucion: number;
  id_cliente: number;
  cliente?: {
    nombre?: string;
    razon_social?: string;
    nombre_cliente?: string;
    [key: string]: any;
  };
  fecha_creacion?: string;
  created_at?: string;
}

export default function ProduccionScreen() {
  const [isModalVisible, setModalVisible] = useState(false);
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchProducciones = async () => {
    try {
      setError('');
      const token = await AsyncStorage.getItem('authToken');

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/production`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Error al obtener los registros de producción');
      }

      const data = await response.json();
      console.log('Respuesta del servidor:', JSON.stringify(data, null, 2));
      
      // Asegurarse de que siempre sea un array
      let produccionesArray: Produccion[] = [];
      
      if (data.success && Array.isArray(data.data)) {
        produccionesArray = data.data;
      } else if (Array.isArray(data)) {
        produccionesArray = data;
      } else if (Array.isArray(data.producciones)) {
        produccionesArray = data.producciones;
      } else if (Array.isArray(data.production)) {
        produccionesArray = data.production;
      } else if (Array.isArray(data.data)) {
        produccionesArray = data.data;
      } else if (data && typeof data === 'object') {
        produccionesArray = Object.values(data).filter((item): item is Produccion => 
          typeof item === 'object' && item !== null && 'id_produccion' in item
        ) as Produccion[];
      }
      
      // Normalizar los datos: asegurar que los números sean siempre números
      produccionesArray = produccionesArray.map((produccion) => ({
        ...produccion,
        produccion_kg: typeof produccion.produccion_kg === 'number' 
          ? produccion.produccion_kg 
          : parseFloat(String(produccion.produccion_kg || '0')) || 0,
        total: typeof produccion.total === 'number' 
          ? produccion.total 
          : parseFloat(String(produccion.total || '0')) || 0,
        devolucion: typeof produccion.devolucion === 'number' 
          ? produccion.devolucion 
          : parseFloat(String(produccion.devolucion || '0')) || 0,
      }));
      
      setProducciones(produccionesArray);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar producción';
      setError(errorMessage);
      setProducciones([]);
      console.error('Error al obtener producción:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducciones();
  }, []);

  const handleProductionAdded = () => {
    // Recargar la lista de producción
    fetchProducciones();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducciones();
  };

  const getClienteNombre = (produccion: Produccion) => {
    if (produccion.cliente) {
      return produccion.cliente.nombre || 
             produccion.cliente.razon_social || 
             produccion.cliente.nombre_cliente ||
             `Cliente #${produccion.id_cliente}`;
    }
    return `Cliente #${produccion.id_cliente}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Asegurarse de que producciones siempre sea un array antes de renderizar
  const produccionesList = Array.isArray(producciones) ? producciones : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="construct" size={32} color="#f59e0b" />
          <Text style={styles.title}>Producción</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Agregar</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Cargando producción...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff3333" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProducciones}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : produccionesList.length === 0 ? (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay registros de producción</Text>
            <Text style={styles.emptySubtext}>Presiona "Agregar" para crear uno nuevo</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {produccionesList.map((produccion) => (
            <View key={produccion.id_produccion} style={styles.productionCard}>
              <View style={styles.productionHeader}>
                <View style={styles.productionHeaderLeft}>
                  <Ionicons name="cube" size={20} color="#f59e0b" />
                  <Text style={styles.productionId}>#{produccion.id_produccion}</Text>
                </View>
                {produccion.fecha_creacion || produccion.created_at ? (
                  <Text style={styles.productionDate}>
                    {formatDate(produccion.fecha_creacion || produccion.created_at)}
                  </Text>
                ) : null}
              </View>

              <View style={styles.productionContent}>
                <View style={styles.productionRow}>
                  <View style={styles.productionInfoItem}>
                    <Ionicons name="person" size={16} color="#666" />
                    <Text style={styles.productionLabel}>Cliente:</Text>
                    <Text style={styles.productionValue}>{getClienteNombre(produccion)}</Text>
                  </View>
                </View>

                <View style={styles.productionStats}>
                  <View style={styles.productionStatItem}>
                    <Ionicons name="scale" size={18} color="#f59e0b" />
                    <Text style={styles.productionStatLabel}>Producción</Text>
                    <Text style={styles.productionStatValue}>
                      {produccion.produccion_kg.toFixed(2)} kg
                    </Text>
                  </View>

                  <View style={styles.productionStatItem}>
                    <Ionicons name="cash" size={18} color="#10b981" />
                    <Text style={styles.productionStatLabel}>Total</Text>
                    <Text style={[styles.productionStatValue, styles.totalValue]}>
                      ${produccion.total.toFixed(2)}
                    </Text>
                  </View>

                  {produccion.devolucion > 0 && (
                    <View style={styles.productionStatItem}>
                      <Ionicons name="return-down-back" size={18} color="#ef4444" />
                      <Text style={styles.productionStatLabel}>Devolución</Text>
                      <Text style={[styles.productionStatValue, styles.devolucionValue]}>
                        {produccion.devolucion.toFixed(2)} kg
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <AddProductionModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onProductionAdded={handleProductionAdded}
      />
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
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3333',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  productionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  productionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#f9f9f9',
  },
  productionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  productionDate: {
    fontSize: 12,
    color: '#666',
  },
  productionContent: {
    padding: 16,
  },
  productionRow: {
    marginBottom: 12,
  },
  productionInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  productionValue: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
  },
  productionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  productionStatItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  productionStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  productionStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    textAlign: 'center',
  },
  totalValue: {
    color: '#10b981',
    fontSize: 18,
  },
  devolucionValue: {
    color: '#ef4444',
  },
});

