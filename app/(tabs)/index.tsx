import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/api';
import AddClientModal from '@/components/AddClientModal';
import AddUserModal from '@/components/AddUserModal';

const fechaActual = new Date().toLocaleDateString('es-MX', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

interface Sucursal {
  id_sucursal?: number;
  nombre?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  telefono?: string;
  ciudad?: string;
  estado?: string;
}

interface Usuario {
  id_usuario?: number;
  nombre?: string;
  email?: string;
  id_sucursal?: number;
  [key: string]: any;
}

interface VentasDia {
  total_ventas?: number;
  total_pedidos?: number;
  cantidad_ventas?: number;
  cantidad_pedidos?: number;
}

export default function HomeScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [sucursal, setSucursal] = useState<Sucursal | null>(null);
  const [ventasDia, setVentasDia] = useState<VentasDia | null>(null);
  const [loadingSucursal, setLoadingSucursal] = useState(true);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [errorSucursal, setErrorSucursal] = useState<string>('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showUsuarioModal, setShowUsuarioModal] = useState(false);

  useEffect(() => {
    loadUserData();
    getSucursalInfo();
    getVentasDia();
  }, []);

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setUsuario(userData);
      }
    } catch (err) {
      console.error('Error al cargar datos del usuario:', err);
    }
  };

  const getVentasDia = async () => {
    try {
      setLoadingVentas(true);
      const token = await AsyncStorage.getItem('authToken');

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Intentar obtener ventas del día desde diferentes endpoints posibles
      const endpoints = [
        `${API_URL}/ventas/dia`,
        `${API_URL}/sales/today`,
        `${API_URL}/pedidos/dia`,
        `${API_URL}/orders/today`,
      ];

      let ventasData: VentasDia | null = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers,
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              ventasData = data.data;
            } else if (data.total_ventas !== undefined || data.total_pedidos !== undefined) {
              ventasData = data;
            }
            break;
          }
        } catch (err) {
          console.log(`Error al intentar ${endpoint}:`, err);
        }
      }

      // Si no se obtuvieron datos, usar valores por defecto
      if (!ventasData) {
        ventasData = {
          total_ventas: 0,
          total_pedidos: 0,
          cantidad_ventas: 0,
          cantidad_pedidos: 0,
        };
      }

      setVentasDia(ventasData);
    } catch (err) {
      console.error('Error al obtener ventas del día:', err);
      setVentasDia({
        total_ventas: 0,
        total_pedidos: 0,
        cantidad_ventas: 0,
        cantidad_pedidos: 0,
      });
    } finally {
      setLoadingVentas(false);
    }
  };

  const getSucursalInfo = async () => {
    try {
      setLoadingSucursal(true);
      setErrorSucursal('');

      // Obtener datos del usuario desde AsyncStorage
      const userDataString = await AsyncStorage.getItem('userData');
      if (!userDataString) {
        throw new Error('No se encontraron datos del usuario');
      }

      const userData = JSON.parse(userDataString);
      console.log('Datos del usuario:', userData);

      // Si el usuario tiene id_sucursal, obtener la información de la sucursal
      let sucursalData: Sucursal | null = null;

      if (userData.id_sucursal) {
        const token = await AsyncStorage.getItem('authToken');
        
        try {
          // Intentar obtener la sucursal desde el endpoint
          const headers: Record<string, string> = {
            'Accept': 'application/json',
          };

          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`${API_URL}/sucursales/${userData.id_sucursal}`, {
            method: 'GET',
            headers,
          });

          if (response.ok) {
            const data = await response.json();
            sucursalData = data.sucursal || data || null;
          } else {
            // Si no hay endpoint, usar los datos del usuario si tiene información de sucursal
            if (userData.sucursal) {
              sucursalData = userData.sucursal;
            } else if (userData.nombre_sucursal || userData.direccion_sucursal) {
              sucursalData = {
                nombre: userData.nombre_sucursal,
                direccion: userData.direccion_sucursal,
                latitud: userData.latitud_sucursal,
                longitud: userData.longitud_sucursal,
                ciudad: userData.ciudad_sucursal,
                estado: userData.estado_sucursal,
              };
            }
          }
        } catch (apiError) {
          console.log('No se pudo obtener desde API, usando datos del usuario:', apiError);
          // Si falla el endpoint, intentar usar datos del usuario
          if (userData.sucursal) {
            sucursalData = userData.sucursal;
          } else if (userData.nombre_sucursal || userData.direccion_sucursal) {
            sucursalData = {
              nombre: userData.nombre_sucursal,
              direccion: userData.direccion_sucursal,
              latitud: userData.latitud_sucursal,
              longitud: userData.longitud_sucursal,
              ciudad: userData.ciudad_sucursal,
              estado: userData.estado_sucursal,
            };
          }
        }
      } else if (userData.sucursal) {
        // Si viene directamente en userData
        sucursalData = userData.sucursal;
      }

      if (!sucursalData) {
        throw new Error('No se encontró información de la sucursal');
      }

      setSucursal(sucursalData);
    } catch (err) {
      console.error('Error al obtener información de sucursal:', err);
      setErrorSucursal(err instanceof Error ? err.message : 'Error al obtener la información de la sucursal');
    } finally {
      setLoadingSucursal(false);
    }
  };

  const formatCoordinates = (lat?: number, lon?: number) => {
    if (lat && lon) {
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
    return 'No disponible';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="home" size={32} color="#f59e0b" />
        <Text style={styles.title}>Inicio</Text>
      </View>
      <ScrollView style={styles.content}>
        {/* Sección de Bienvenida */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeContent}>
            <Ionicons name="person-circle" size={48} color="#f59e0b" />
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeText}>
                ¡Bienvenido{usuario?.nombre ? `, ${usuario.nombre}` : ''}!
              </Text>
              <Text style={styles.date}>{fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1)}</Text>
            </View>
          </View>
        </View>

        {/* Sección de Gráfica de Ventas del Día */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="bar-chart" size={24} color="#f59e0b" />
              <Text style={styles.cardTitle}>Ventas del Día</Text>
            </View>
            <TouchableOpacity onPress={getVentasDia} disabled={loadingVentas}>
              <Ionicons 
                name="refresh" 
                size={20} 
                color={loadingVentas ? "#ccc" : "#f59e0b"} 
              />
            </TouchableOpacity>
          </View>

          {loadingVentas ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text style={styles.chartLoadingText}>Cargando datos...</Text>
            </View>
          ) : ventasDia ? (
            <View style={styles.chartContainer}>
              <View style={styles.chartRow}>
                <View style={styles.chartItem}>
                  <View style={[styles.chartBar, { height: Math.min((ventasDia.total_ventas || 0) / 1000 * 100, 100) }]} />
                  <Text style={styles.chartLabel}>Ventas</Text>
                  <Text style={styles.chartValue}>${(ventasDia.total_ventas || 0).toFixed(2)}</Text>
                  <Text style={styles.chartCount}>{ventasDia.cantidad_ventas || 0} ventas</Text>
                </View>
                <View style={styles.chartItem}>
                  <View style={[styles.chartBar, { height: Math.min((ventasDia.total_pedidos || 0) / 1000 * 100, 100) }]} />
                  <Text style={styles.chartLabel}>Pedidos</Text>
                  <Text style={styles.chartValue}>${(ventasDia.total_pedidos || 0).toFixed(2)}</Text>
                  <Text style={styles.chartCount}>{ventasDia.cantidad_pedidos || 0} pedidos</Text>
                </View>
              </View>
              <View style={styles.chartTotal}>
                <Text style={styles.chartTotalLabel}>Total del Día</Text>
                <Text style={styles.chartTotalValue}>
                  ${((ventasDia.total_ventas || 0) + (ventasDia.total_pedidos || 0)).toFixed(2)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Sección de Registro Rápido */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registro Rápido</Text>
          <View style={styles.quickRegister}>
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => setShowClienteModal(true)}>
              <View style={styles.registerButtonContent}>
                <Ionicons name="person-add" size={24} color="white" />
                <Text style={styles.registerButtonText}>Nuevo Cliente</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={() => setShowUsuarioModal(true)}>
              <View style={styles.registerButtonContent}>
                <Ionicons name="people" size={24} color="white" />
                <Text style={styles.registerButtonText}>Nuevo Usuario</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección de Ubicación de Sucursal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="location" size={24} color="#f59e0b" />
              <Text style={styles.cardTitle}>Ubicación de Sucursal</Text>
            </View>
            <TouchableOpacity onPress={getSucursalInfo} disabled={loadingSucursal}>
              <Ionicons 
                name="refresh" 
                size={20} 
                color={loadingSucursal ? "#ccc" : "#f59e0b"} 
              />
            </TouchableOpacity>
          </View>

          {loadingSucursal ? (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text style={styles.locationLoadingText}>Cargando información de sucursal...</Text>
            </View>
          ) : errorSucursal ? (
            <View style={styles.locationError}>
              <Ionicons name="alert-circle" size={20} color="#ff3333" />
              <Text style={styles.locationErrorText}>{errorSucursal}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={getSucursalInfo}>
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : sucursal ? (
            <View style={styles.locationInfo}>
              {sucursal.nombre && (
                <>
                  <View style={styles.locationRow}>
                    <Ionicons name="business" size={18} color="#666" />
                    <Text style={styles.locationLabel}>Sucursal:</Text>
                  </View>
                  <Text style={styles.locationValue}>{sucursal.nombre}</Text>
                </>
              )}

              {sucursal.direccion && (
                <>
                  <View style={[styles.locationRow, { marginTop: 12 }]}>
                    <Ionicons name="home" size={18} color="#666" />
                    <Text style={styles.locationLabel}>Dirección:</Text>
                  </View>
                  <Text style={styles.locationValue}>{sucursal.direccion}</Text>
                </>
              )}

              {(sucursal.ciudad || sucursal.estado) && (
                <>
                  <View style={[styles.locationRow, { marginTop: 12 }]}>
                    <Ionicons name="map" size={18} color="#666" />
                    <Text style={styles.locationLabel}>Ciudad/Estado:</Text>
                  </View>
                  <Text style={styles.locationValue}>
                    {[sucursal.ciudad, sucursal.estado].filter(Boolean).join(', ') || 'No disponible'}
                  </Text>
                </>
              )}

              {(sucursal.latitud && sucursal.longitud) && (
                <>
                  <View style={[styles.locationRow, { marginTop: 12 }]}>
                    <Ionicons name="navigate" size={18} color="#666" />
                    <Text style={styles.locationLabel}>Coordenadas:</Text>
                  </View>
                  <Text style={styles.locationValue}>
                    {formatCoordinates(sucursal.latitud, sucursal.longitud)}
                  </Text>
                </>
              )}

              {sucursal.telefono && (
                <>
                  <View style={[styles.locationRow, { marginTop: 12 }]}>
                    <Ionicons name="call" size={18} color="#666" />
                    <Text style={styles.locationLabel}>Teléfono:</Text>
                  </View>
                  <Text style={styles.locationValue}>{sucursal.telefono}</Text>
                </>
              )}
            </View>
          ) : null}
        </View>

      </ScrollView>

      <AddClientModal
        isVisible={showClienteModal}
        onClose={() => setShowClienteModal(false)}
        onClientAdded={() => {
          console.log('Cliente agregado');
        }}
      />

      <AddUserModal
        isVisible={showUsuarioModal}
        onClose={() => setShowUsuarioModal(false)}
        onUserAdded={() => {
          console.log('Usuario agregado');
        }}
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
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  date: {
    color: '#777',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  locationLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  locationError: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  locationErrorText: {
    fontSize: 14,
    color: '#ff3333',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  locationInfo: {
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  locationValue: {
    fontSize: 14,
    color: '#333',
    marginLeft: 24,
    marginBottom: 8,
  },
  accuracyContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  accuracyText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  chartLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  chartLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  chartContainer: {
    marginTop: 12,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
    marginBottom: 16,
  },
  chartItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  chartBar: {
    width: 60,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    minHeight: 20,
    maxHeight: 120,
  },
  chartLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  chartValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  chartCount: {
    fontSize: 10,
    color: '#999',
  },
  chartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e5e5',
    marginTop: 8,
  },
  chartTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  chartTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  quickRegister: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  registerButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  registerButtonContent: {
    alignItems: 'center',
    gap: 8,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
