import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
  ubicacion?: string; // Campo que viene del backend
  gerente?: string; // Campo que viene del backend
  latitud?: number;
  longitud?: number;
  telefono?: string;
  ciudad?: string;
  estado?: string;
  imagen?: string | null;
  [key: string]: any; // Para permitir otros campos que vengan de la BD
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
  const [uploadingImage, setUploadingImage] = useState(false);

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

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('No hay token de autenticación');
        setSucursal(null);
        setErrorSucursal('');
        return;
      }

      // Obtener la información de la sucursal desde el endpoint
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      console.log('Obteniendo información de sucursal desde:', `${API_URL}/auth/sucursal`);

      const response = await fetch(`${API_URL}/auth/sucursal`, {
        method: 'GET',
        headers,
      });

      console.log('Respuesta de sucursal:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Token inválido o expirado');
          await AsyncStorage.removeItem('authToken');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Datos de sucursal recibidos:', data);

      // El backend puede devolver la sucursal en diferentes formatos
      let sucursalData: Sucursal | null = null;

      // Estructura: { success: true, data: { sucursal: {...} } }
      if (data.success && data.data && data.data.sucursal) {
        sucursalData = data.data.sucursal;
      } else if (data.success && data.data && typeof data.data === 'object' && 'id_sucursal' in data.data) {
        // Si data.data es directamente la sucursal
        sucursalData = data.data;
      } else if (data.sucursal) {
        sucursalData = data.sucursal;
      } else if (data && typeof data === 'object' && 'id_sucursal' in data) {
        sucursalData = data;
      }

      if (sucursalData) {
        console.log('Sucursal parseada:', sucursalData);
        setSucursal(sucursalData);
        setErrorSucursal('');
        console.log('Información de sucursal cargada correctamente');
      } else {
        console.log('No se encontró información de sucursal en la respuesta');
        console.log('Estructura completa de la respuesta:', JSON.stringify(data, null, 2));
        setSucursal(null);
        setErrorSucursal('');
      }
    } catch (err) {
      console.error('Error al obtener información de sucursal:', err);
      setSucursal(null);
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

  const getImageUrl = (imagen: string | null | undefined) => {
    if (!imagen) return null;
    // Si la imagen es una URL completa, usarla directamente
    if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
      return imagen;
    }
    // Si es una ruta relativa, construir la URL completa
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${imagen.startsWith('/') ? imagen : '/' + imagen}`;
  };

  const pickImage = async () => {
    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos necesarios', 'Se necesitan permisos para acceder a la galería.');
      return;
    }

    // Mostrar opciones: Galería o Cámara
    Alert.alert(
      'Seleccionar Imagen',
      '¿De dónde quieres seleccionar la imagen?',
      [
        {
          text: 'Galería',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              await uploadSucursalImage(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Cámara',
          onPress: async () => {
            const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus.status !== 'granted') {
              Alert.alert('Permisos necesarios', 'Se necesitan permisos para acceder a la cámara.');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              await uploadSucursalImage(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const uploadSucursalImage = async (imageUri: string) => {
    try {
      setUploadingImage(true);
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('Error', 'No hay token de autenticación. Por favor, inicia sesión de nuevo.');
        return;
      }

      // Crear FormData para enviar la imagen
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'imagen.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('imagen', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      console.log('Subiendo imagen de sucursal a:', `${API_URL}/auth/sucursal/imagen`);

      const response = await fetch(`${API_URL}/auth/sucursal/imagen`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Error al actualizar la imagen';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.log('No se pudo parsear el error como JSON:', parseError);
          try {
            const textError = await response.text();
            console.log('Error como texto:', textError);
            if (textError) {
              errorMessage = textError;
            }
          } catch {}
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Imagen actualizada correctamente:', data);

      // Actualizar la información de la sucursal
      await getSucursalInfo();
      
      Alert.alert('Éxito', 'Imagen de sucursal actualizada correctamente.');
    } catch (err) {
      console.error('Error al subir imagen:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Error al actualizar la imagen de la sucursal'
      );
    } finally {
      setUploadingImage(false);
    }
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
        {sucursal && (
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
            ) : (
            <View style={styles.locationInfo}>
              <View style={styles.locationContent}>
                {/* Información de texto a la izquierda */}
                <View style={styles.locationTextContainer}>
                  {/* Mostrar todos los campos tal cual vienen de la BD */}
                  {(sucursal.nombre || sucursal.gerente) && (
                    <>
                      <View style={styles.locationRow}>
                        <Ionicons name="business" size={18} color="#666" />
                        <Text style={styles.locationLabel}>
                          {sucursal.nombre ? 'Sucursal:' : 'Gerente:'}
                        </Text>
                      </View>
                      <Text style={styles.locationValue}>
                        {String(sucursal.nombre || sucursal.gerente || '')}
                      </Text>
                    </>
                  )}

                  {(sucursal.direccion || sucursal.ubicacion) && (
                    <>
                      <View style={[styles.locationRow, { marginTop: 12 }]}>
                        <Ionicons name="home" size={18} color="#666" />
                        <Text style={styles.locationLabel}>Ubicación:</Text>
                      </View>
                      <Text style={styles.locationValue}>
                        {String(sucursal.direccion || sucursal.ubicacion || '')}
                      </Text>
                    </>
                  )}
                </View>

                {/* Imagen de la sucursal a la derecha */}
                <TouchableOpacity
                  style={styles.sucursalImageContainer}
                  onPress={pickImage}
                  disabled={uploadingImage}>
                  {sucursal.imagen ? (
                    <Image
                      source={{ uri: getImageUrl(sucursal.imagen) || undefined }}
                      style={styles.sucursalImage}
                      contentFit="cover"
                      placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                      transition={200}
                    />
                  ) : (
                    <View style={styles.sucursalImagePlaceholder}>
                      <Ionicons name="image-outline" size={40} color="#ccc" />
                    </View>
                  )}
                  {/* Icono de lápiz para editar */}
                  <View style={styles.editImageButton}>
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="pencil" size={16} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {sucursal.ciudad && (
                <>
                  <View style={[styles.locationRow, { marginTop: 12 }]}>
                    <Ionicons name="map" size={18} color="#666" />
                    <Text style={styles.locationLabel}>Ciudad:</Text>
                  </View>
                  <Text style={styles.locationValue}>{String(sucursal.ciudad)}</Text>
                </>
              )}

              {sucursal.estado && (
                <>
                  <View style={[styles.locationRow, { marginTop: 12 }]}>
                    <Ionicons name="map" size={18} color="#666" />
                    <Text style={styles.locationLabel}>Estado:</Text>
                  </View>
                  <Text style={styles.locationValue}>{String(sucursal.estado)}</Text>
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
                  <Text style={styles.locationValue}>{String(sucursal.telefono)}</Text>
                </>
              )}
            </View>
            )}
          </View>
        )}

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
  locationContent: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  locationTextContainer: {
    flex: 1,
    minWidth: 0, // Permite que el texto se ajuste
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
  sucursalImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    flexShrink: 0,
    position: 'relative',
  },
  sucursalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  sucursalImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
