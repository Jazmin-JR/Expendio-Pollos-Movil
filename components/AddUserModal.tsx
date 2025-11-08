import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AddUserModalProps {
  isVisible: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

interface Sucursal {
  id_sucursal: number;
  nombre?: string;
  [key: string]: any;
}

export default function AddUserModal({ isVisible, onClose, onUserAdded }: AddUserModalProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [idSucursal, setIdSucursal] = useState<number | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSucursales, setLoadingSucursales] = useState(false);
  const [error, setError] = useState('');
  const [showSucursalSelector, setShowSucursalSelector] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchSucursales();
      // Obtener id_sucursal del usuario actual
      loadCurrentUserSucursal();
    }
  }, [isVisible]);

  const loadCurrentUserSucursal = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        if (userData.id_sucursal) {
          setIdSucursal(userData.id_sucursal);
        }
      }
    } catch (err) {
      console.error('Error al cargar sucursal del usuario:', err);
    }
  };

  const fetchSucursales = async () => {
    try {
      setLoadingSucursales(true);
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const endpoint = `${API_URL}/sucursales`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('authToken');
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }

      if (!response.ok) {
        throw new Error('Error al obtener sucursales');
      }

      const data = await response.json();
      
      let sucursalesData: Sucursal[] = [];
      
      if (data.success && Array.isArray(data.data)) {
        sucursalesData = data.data;
      } else if (Array.isArray(data)) {
        sucursalesData = data;
      } else if (Array.isArray(data.sucursales)) {
        sucursalesData = data.sucursales;
      }

      setSucursales(sucursalesData);
    } catch (err) {
      console.error('Error al obtener sucursales:', err);
      // No mostrar error si no se pueden obtener, usar la del usuario actual
    } finally {
      setLoadingSucursales(false);
    }
  };

  const handleAddUser = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim() || !idSucursal) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setError('No hay token de autenticación. Por favor, inicia sesión de nuevo.');
        setLoading(false);
        return;
      }

      const userData = {
        nombre: nombre.trim(),
        email: email.trim(),
        password: password,
        id_sucursal: idSucursal,
      };

      console.log('Intentando agregar usuario a:', `${API_URL}/usuarios`);
      console.log('Datos enviados:', { ...userData, password: '***' });

      const response = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Error al agregar usuario';
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

      await response.json();
      Alert.alert('Éxito', 'Usuario agregado correctamente.');
      onUserAdded();
      onClose();
      resetForm();
    } catch (err) {
      let displayErrorMessage = 'Error de conexión. Verifica que el servidor esté corriendo.';
      if (err instanceof Error) {
        displayErrorMessage = err.message;
        console.error('Error al agregar usuario:', err);
      }
      setError(displayErrorMessage);
      Alert.alert('Error', displayErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setEmail('');
    setPassword('');
    loadCurrentUserSucursal(); // Restaurar sucursal del usuario actual
    setError('');
    setShowSucursalSelector(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectSucursal = (sucursal: Sucursal) => {
    setIdSucursal(sucursal.id_sucursal);
    setShowSucursalSelector(false);
    setError('');
  };

  const getSucursalNombre = () => {
    if (!idSucursal) return null;
    const sucursal = sucursales.find((s) => s.id_sucursal === idSucursal);
    if (sucursal) {
      return sucursal.nombre || `Sucursal #${sucursal.id_sucursal}`;
    }
    return `Sucursal #${idSucursal}`;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Nuevo Usuario</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={30} color="#f59e0b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="red" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del usuario"
              placeholderTextColor="#999"
              value={nombre}
              onChangeText={(text) => {
                setNombre(text);
                setError('');
              }}
              autoCapitalize="words"
              editable={!loading}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="email@ejemplo.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={styles.label}>Contraseña *</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#999"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              secureTextEntry
              editable={!loading}
            />

            <Text style={styles.label}>Sucursal *</Text>
            {loadingSucursales ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.loadingText}>Cargando sucursales...</Text>
              </View>
            ) : sucursales.length > 0 ? (
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => !loading && setShowSucursalSelector(true)}
                disabled={loading}>
                <Text style={[styles.selectButtonText, !idSucursal && styles.selectButtonPlaceholder]}>
                  {getSucursalNombre() || 'Selecciona una sucursal'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            ) : (
              <View style={styles.infoContainer}>
                <Ionicons name="information-circle" size={20} color="#666" style={{ marginRight: 8 }} />
                <Text style={styles.infoText}>
                  Se usará la sucursal asignada a tu cuenta
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAddUser}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="add-circle" size={22} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Agregar Usuario</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Selector de sucursal */}
      {showSucursalSelector && sucursales.length > 0 && (
        <View style={styles.selectorOverlay}>
          <TouchableOpacity
            style={styles.selectorBackdrop}
            activeOpacity={1}
            onPress={() => setShowSucursalSelector(false)}
          />
          <View style={styles.selectorContainer}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Selecciona una Sucursal</Text>
              <TouchableOpacity onPress={() => setShowSucursalSelector(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.selectorScrollView} showsVerticalScrollIndicator={true}>
              {sucursales.map((sucursal) => (
                <TouchableOpacity
                  key={sucursal.id_sucursal}
                  style={[
                    styles.selectorOption,
                    idSucursal === sucursal.id_sucursal && styles.selectorOptionSelected,
                  ]}
                  onPress={() => selectSucursal(sucursal)}>
                  <Text
                    style={[
                      styles.selectorOptionText,
                      idSucursal === sucursal.id_sucursal && styles.selectorOptionTextSelected,
                    ]}>
                    {sucursal.nombre || `Sucursal #${sucursal.id_sucursal}`}
                  </Text>
                  {idSucursal === sucursal.id_sucursal && (
                    <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 25,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: Platform.OS === 'ios' ? 15 : 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#111',
  },
  selectButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Platform.OS === 'ios' ? 15 : 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#111',
  },
  selectButtonPlaceholder: {
    color: '#999',
  },
  button: {
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    backgroundColor: '#f59e0b',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    flexShrink: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    backgroundColor: '#f0f9ff',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    flexShrink: 1,
  },
  selectorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  selectorBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  selectorContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '80%',
    maxWidth: 400,
    maxHeight: '60%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  selectorScrollView: {
    maxHeight: 300,
  },
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  selectorOptionSelected: {
    backgroundColor: '#fffbf5',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  selectorOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectorOptionTextSelected: {
    fontWeight: '600',
    color: '#f59e0b',
  },
});

