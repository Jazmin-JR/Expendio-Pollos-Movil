import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
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

interface Reporte {
  id_report?: number;
  id_sucursal?: number;
  total_ventas?: string;
  fecha?: string;
  sucursal?: {
    id_sucursal?: number;
    nombre?: string;
  };
}

interface Sincronizacion {
  id_sincronizacion?: number;
  id_sucursal?: number;
  pendiente?: boolean;
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
  
  // Estados para estadísticas
  const [reporteActual, setReporteActual] = useState<Reporte | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [fechaFiltro, setFechaFiltro] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  useEffect(() => {
    loadUserData();
    getSucursalInfo();
    getVentasDia();
  }, []);

  // Cargar reportes cuando se obtenga la sucursal
  useEffect(() => {
    if (sucursal?.id_sucursal || usuario?.id_sucursal) {
      getReportes();
    }
  }, [sucursal?.id_sucursal, usuario?.id_sucursal]);

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
          throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
        }
        
        // Si el endpoint no existe (404), simplemente no mostrar la sección de sucursal
        if (response.status === 404) {
          console.log('Endpoint de sucursal no disponible en este servidor');
          setSucursal(null);
          setErrorSucursal('');
          setLoadingSucursal(false);
          return;
        }
        
        // Para otros errores, intentar obtener el mensaje del servidor
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
              errorMessage = errorText || errorMessage;
            }
          }
        } catch {}
        
        throw new Error(errorMessage);
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

  // Función para solicitar sincronización
  const solicitarSincronizacion = async () => {
    try {
      const idSucursal = sucursal?.id_sucursal || usuario?.id_sucursal;
      if (!idSucursal) {
        Alert.alert('Error', 'No se pudo obtener el ID de la sucursal');
        return;
      }

      setSincronizando(true);
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('Error', 'No hay token de autenticación. Por favor, inicia sesión de nuevo.');
        return;
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(`${API_URL}/sales-integration/request-sync/${idSucursal}`, {
        method: 'POST',
        headers,
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('authToken');
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Éxito', data.message || 'Sincronización solicitada correctamente');
        // Recargar reportes después de la sincronización
        setTimeout(() => {
          getReportes();
        }, 2000);
      } else {
        throw new Error(data.message || 'Error al solicitar sincronización');
      }
    } catch (err) {
      console.error('Error al solicitar sincronización:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Error al solicitar la sincronización'
      );
    } finally {
      setSincronizando(false);
    }
  };

  // Función para obtener reporte de una fecha específica
  const getReportePorFecha = async (fecha: string) => {
    try {
      const idSucursal = sucursal?.id_sucursal || usuario?.id_sucursal;
      if (!idSucursal) {
        Alert.alert('Error', 'No se pudo obtener el ID de la sucursal');
        return;
      }

      setLoadingReporte(true);
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('Error', 'No hay token de autenticación. Por favor, inicia sesión de nuevo.');
        setLoadingReporte(false);
        return;
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(`${API_URL}/sales-integration/reporte/${idSucursal}/${fecha}`, {
        method: 'GET',
        headers,
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('authToken');
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setReporteActual(data.data);
      } else {
        setReporteActual(null);
      }
    } catch (err) {
      console.error('Error al obtener reporte:', err);
      setReporteActual(null);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Error al obtener el reporte'
      );
    } finally {
      setLoadingReporte(false);
    }
  };

  // Función para obtener todos los reportes
  const getReportes = async () => {
    try {
      const idSucursal = sucursal?.id_sucursal || usuario?.id_sucursal;
      if (!idSucursal) {
        console.log('No hay idSucursal disponible');
        return;
      }

      setLoadingReportes(true);
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        console.log('No hay token de autenticación para obtener reportes');
        setReportes([]);
        setLoadingReportes(false);
        return;
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      let url = `${API_URL}/sales-integration/reportes/${idSucursal}`;
      
      // Si hay filtros de fecha, agregarlos
      if (fechaDesde && fechaHasta) {
        url += `?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`;
      }

      console.log('Obteniendo reportes desde:', url);
      console.log('Token presente:', !!token);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      console.log('Respuesta de reportes:', response.status, response.statusText);

      if (response.status === 401) {
        await AsyncStorage.removeItem('authToken');
        console.log('Token inválido o expirado');
        setReportes([]);
        setLoadingReportes(false);
        return;
      }

      if (!response.ok) {
        let errorText = '';
        let errorData: any = {};
        
        try {
          errorText = await response.text();
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          errorData = { message: errorText || `Error ${response.status}` };
        }
        
        console.error('Error al obtener reportes:', {
          status: response.status,
          statusText: response.statusText,
          message: errorData.message || errorData.error || 'Error desconocido',
          data: errorData
        });
        setReportes([]);
        setLoadingReportes(false);
        return;
      }

      const data = await response.json();
      console.log('Datos de reportes recibidos:', data);
      
      if (data.success && Array.isArray(data.data)) {
        console.log(`Se obtuvieron ${data.data.length} reportes`);
        setReportes(data.data);
      } else if (data.success && data.data === null) {
        console.log('No hay reportes disponibles (data es null)');
        setReportes([]);
      } else {
        console.log('Estructura de datos inesperada:', data);
        setReportes([]);
      }
    } catch (err) {
      console.error('Error al obtener reportes (catch):', err);
      if (err instanceof Error) {
        console.error('Mensaje de error:', err.message);
        console.error('Stack:', err.stack);
      }
      setReportes([]);
    } finally {
      setLoadingReportes(false);
    }
  };

  // Función para formatear fecha
  const formatearFecha = (fecha?: string) => {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return fecha;
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

        {/* Sección de Estadísticas */}
        {sucursal && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="stats-chart" size={24} color="#f59e0b" />
                <Text style={styles.cardTitle}>Estadísticas de Ventas</Text>
              </View>
              <TouchableOpacity 
                onPress={solicitarSincronizacion} 
                disabled={sincronizando}
                style={styles.syncButton}>
                {sincronizando ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <Ionicons name="sync" size={20} color="#f59e0b" />
                )}
              </TouchableOpacity>
            </View>

            {/* Filtros de fecha */}
            <View style={styles.filtersContainer}>
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Buscar por fecha:</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  value={fechaFiltro}
                  onChangeText={setFechaFiltro}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.filterButton}
                  onPress={() => {
                    if (fechaFiltro) {
                      getReportePorFecha(fechaFiltro);
                    }
                  }}
                  disabled={loadingReporte || !fechaFiltro}>
                  <Ionicons name="search" size={18} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>Rango de fechas:</Text>
                <View style={styles.dateRangeContainer}>
                  <TextInput
                    style={[styles.dateInput, { flex: 1 }]}
                    placeholder="Desde (YYYY-MM-DD)"
                    value={fechaDesde}
                    onChangeText={setFechaDesde}
                    placeholderTextColor="#999"
                  />
                  <TextInput
                    style={[styles.dateInput, { flex: 1 }]}
                    placeholder="Hasta (YYYY-MM-DD)"
                    value={fechaHasta}
                    onChangeText={setFechaHasta}
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={getReportes}
                    disabled={loadingReportes}>
                    <Ionicons name="filter" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Reporte de fecha específica */}
            {loadingReporte ? (
              <View style={styles.statsLoading}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.statsLoadingText}>Cargando reporte...</Text>
              </View>
            ) : reporteActual ? (
              <View style={styles.reporteCard}>
                <View style={styles.reporteHeader}>
                  <Ionicons name="document-text" size={20} color="#10b981" />
                  <Text style={styles.reporteTitle}>Reporte del {formatearFecha(reporteActual.fecha)}</Text>
                </View>
                <View style={styles.reporteContent}>
                  <View style={styles.reporteItem}>
                    <Text style={styles.reporteLabel}>Total de Ventas:</Text>
                    <Text style={styles.reporteValue}>
                      ${parseFloat(reporteActual.total_ventas || '0').toFixed(2)}
                    </Text>
                  </View>
                  {reporteActual.sucursal?.nombre && (
                    <View style={styles.reporteItem}>
                      <Text style={styles.reporteLabel}>Sucursal:</Text>
                      <Text style={styles.reporteValue}>{reporteActual.sucursal.nombre}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : null}

            {/* Lista de reportes */}
            {loadingReportes ? (
              <View style={styles.statsLoading}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.statsLoadingText}>Cargando reportes...</Text>
              </View>
            ) : reportes.length > 0 ? (
              <View style={styles.reportesList}>
                <Text style={styles.reportesListTitle}>
                  {fechaDesde && fechaHasta 
                    ? `Reportes del ${formatearFecha(fechaDesde)} al ${formatearFecha(fechaHasta)}`
                    : 'Todos los Reportes'}
                </Text>
                {reportes.map((reporte, index) => (
                  <View key={reporte.id_report || index} style={styles.reporteItemCard}>
                    <View style={styles.reporteItemHeader}>
                      <Ionicons name="calendar" size={16} color="#666" />
                      <Text style={styles.reporteItemDate}>
                        {formatearFecha(reporte.fecha)}
                      </Text>
                    </View>
                    <Text style={styles.reporteItemValue}>
                      ${parseFloat(reporte.total_ventas || '0').toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : !loadingReportes && !loadingReporte ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No hay reportes disponibles</Text>
                <Text style={styles.emptyStateSubtext}>
                  Usa los filtros para buscar reportes o solicita una sincronización
                </Text>
              </View>
            ) : null}
          </View>
        )}

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
  // Estilos para estadísticas
  syncButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff5e6',
  },
  filtersContainer: {
    marginTop: 12,
    gap: 16,
  },
  filterRow: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
    minWidth: 120,
  },
  filterButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  statsLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  reporteCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  reporteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reporteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  reporteContent: {
    gap: 12,
  },
  reporteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reporteLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reporteValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  reportesList: {
    marginTop: 16,
    gap: 12,
  },
  reportesListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  reporteItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  reporteItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  reporteItemDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reporteItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
