import { API_URL } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface AddProductionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onProductionAdded: () => void;
}

interface Cliente {
  id_cliente: number;
  nombre?: string;
  razon_social?: string;
  [key: string]: any;
}

export default function AddProductionModal({ isVisible, onClose, onProductionAdded }: AddProductionModalProps) {
  const [produccionKg, setProduccionKg] = useState('');
  const [total, setTotal] = useState('');
  const [devolucion, setDevolucion] = useState('');
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [error, setError] = useState('');
  const [showClienteSelector, setShowClienteSelector] = useState(false);

  const fetchClientes = useCallback(async () => {
    try {
      setLoadingClientes(true);
      setError('');

      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        throw new Error('No hay token de autenticación. Por favor, inicia sesión de nuevo.');
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const endpoint = `${API_URL}/clients`;
      
      console.log('Obteniendo clientes desde:', endpoint);
      console.log('Token presente:', !!token);
      console.log('Token (primeros 20 chars):', token.substring(0, 20) + '...');
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      console.log('Respuesta de clientes:', response.status, response.statusText);

      // Si es error 401, el token es inválido o expirado
      if (response.status === 401) {
        // Limpiar token inválido
        await AsyncStorage.removeItem('authToken');
        const errorData = await response.json().catch(() => ({ message: 'Token inválido o expirado' }));
        throw new Error(errorData.message || 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }

      if (!response.ok) {
        let errorText = '';
        let errorData: any = {};
        
        try {
          errorText = await response.text();
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `Error ${response.status}` };
        }
        
        console.log(`Error ${response.status}:`, errorData);
        throw new Error(errorData.message || errorData.error || `Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Datos de clientes recibidos:', data);
      
      let clientesData: Cliente[] = [];
      
      // El backend devuelve: { success: true, data: [...], count: ... }
      if (data.success && Array.isArray(data.data)) {
        clientesData = data.data;
      } else if (Array.isArray(data)) {
        clientesData = data;
      } else if (Array.isArray(data.clients)) {
        clientesData = data.clients;
      } else if (Array.isArray(data.clientes)) {
        clientesData = data.clientes;
      } else if (Array.isArray(data.data)) {
        clientesData = data.data;
      } else if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length > 0) {
          const firstKey = keys[0];
          if (Array.isArray(data[firstKey])) {
            clientesData = data[firstKey];
          }
        }
      }

      if (clientesData.length === 0) {
        console.warn('No se encontraron clientes, pero la respuesta fue exitosa');
        // No lanzar error si la respuesta fue exitosa pero no hay clientes
        setClientes([]);
      } else {
        setClientes(clientesData);
      }
      
      setError('');
    } catch (err) {
      console.error('Error al obtener clientes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al obtener clientes';
      
      if (errorMessage.includes('token') || 
          errorMessage.includes('autenticación') || 
          errorMessage.includes('sesión') ||
          errorMessage.includes('expirado') ||
          errorMessage.includes('inválido')) {
        Alert.alert(
          'Error de autenticación',
          errorMessage,
          [{ text: 'OK', onPress: () => onClose() }]
        );
      } else {
        setError(`No se pudieron cargar los clientes: ${errorMessage}`);
      }
    } finally {
      setLoadingClientes(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      fetchClientes();
    }
  }, [isVisible, fetchClientes]);

  const handleAddProduction = async () => {
    if (!produccionKg.trim() || !total.trim() || idCliente === null) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    const produccionKgNum = parseFloat(produccionKg);
    const totalNum = parseFloat(total);
    const devolucionNum = devolucion.trim() ? parseFloat(devolucion) : 0;

    if (isNaN(produccionKgNum) || produccionKgNum <= 0) {
      setError('Por favor, ingresa una producción válida en kg.');
      return;
    }

    if (isNaN(totalNum) || totalNum < 0) {
      setError('Por favor, ingresa un total válido.');
      return;
    }

    if (isNaN(devolucionNum) || devolucionNum < 0) {
      setError('Por favor, ingresa una devolución válida.');
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

      const productionData = {
        produccion_kg: produccionKgNum,
        total: totalNum,
        devolucion: devolucionNum,
        id_cliente: idCliente,
      };

      console.log('Intentando agregar producción a:', `${API_URL}/production`);
      console.log('Datos enviados:', productionData);

      const response = await fetch(`${API_URL}/production`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productionData),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Error al agregar producción';
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

      await response.json(); // La respuesta puede contener datos, pero no los necesitamos aquí
      Alert.alert('Éxito', 'Producción agregada correctamente.');
      onProductionAdded();
      onClose();
      resetForm();
    } catch (err) {
      let displayErrorMessage = 'Error de conexión. Verifica que el servidor esté corriendo.';
      if (err instanceof Error) {
        displayErrorMessage = err.message;
        console.error('Error al agregar producción:', err);
      }
      setError(displayErrorMessage);
      Alert.alert('Error', displayErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProduccionKg('');
    setTotal('');
    setDevolucion('');
    setIdCliente(null);
    setError('');
    setShowClienteSelector(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectCliente = (cliente: Cliente) => {
    setIdCliente(cliente.id_cliente);
    setShowClienteSelector(false);
    setError('');
  };

  const getClienteNombre = () => {
    if (!idCliente) return null;
    const cliente = clientes.find((c) => c.id_cliente === idCliente);
    if (cliente) {
      // Intentar diferentes campos posibles para el nombre
      return cliente.nombre || 
             cliente.razon_social || 
             cliente.nombre_cliente ||
             cliente.nombreCompleto ||
             cliente.name ||
             `Cliente #${cliente.id_cliente}`;
    }
    return `Cliente #${idCliente}`;
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
            <Text style={styles.modalTitle}>Agregar Nueva Producción</Text>
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

            <Text style={styles.label}>Cliente *</Text>
            {loadingClientes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.loadingText}>Cargando clientes...</Text>
              </View>
            ) : clientes.length > 0 ? (
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => !loading && setShowClienteSelector(true)}
                disabled={loading}>
                <Text style={[styles.selectButtonText, !idCliente && styles.selectButtonPlaceholder]}>
                  {getClienteNombre() || 'Selecciona un cliente'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="red" style={{ marginRight: 8 }} />
                <Text style={styles.errorText}>
                  No se pudieron cargar los clientes. Presiona el botón de actualizar para reintentar.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={fetchClientes}
                  disabled={loadingClientes}>
                  <Ionicons name="refresh" size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>Producción (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#999"
              value={produccionKg}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                setProduccionKg(cleaned);
                setError('');
              }}
              keyboardType="numeric"
              editable={!loading}
            />

            <Text style={styles.label}>Total *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#999"
              value={total}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                setTotal(cleaned);
                setError('');
              }}
              keyboardType="numeric"
              editable={!loading}
            />

            <Text style={styles.label}>Devolución (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#999"
              value={devolucion}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                setDevolucion(cleaned);
                setError('');
              }}
              keyboardType="numeric"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAddProduction}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="add-circle" size={22} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Agregar Producción</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Selector de cliente */}
      {showClienteSelector && (
        <View style={styles.selectorOverlay}>
          <TouchableOpacity
            style={styles.selectorBackdrop}
            activeOpacity={1}
            onPress={() => setShowClienteSelector(false)}
          />
          <View style={styles.selectorContainer}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Selecciona un Cliente</Text>
              <TouchableOpacity onPress={() => setShowClienteSelector(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {loadingClientes ? (
              <View style={styles.selectorLoading}>
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={styles.selectorLoadingText}>Cargando clientes...</Text>
              </View>
            ) : clientes.length > 0 ? (
              <ScrollView style={styles.selectorScrollView} showsVerticalScrollIndicator={true}>
                {clientes.map((cliente) => {
                  const nombreCliente = cliente.nombre || 
                                       cliente.razon_social || 
                                       cliente.nombre_cliente ||
                                       cliente.nombreCompleto ||
                                       cliente.name ||
                                       `Cliente #${cliente.id_cliente}`;
                  
                  return (
                    <TouchableOpacity
                      key={cliente.id_cliente}
                      style={[
                        styles.selectorOption,
                        idCliente === cliente.id_cliente && styles.selectorOptionSelected,
                      ]}
                      onPress={() => selectCliente(cliente)}>
                      <Text
                        style={[
                          styles.selectorOptionText,
                          idCliente === cliente.id_cliente && styles.selectorOptionTextSelected,
                        ]}>
                        {nombreCliente}
                      </Text>
                      {idCliente === cliente.id_cliente && (
                        <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.selectorEmpty}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.selectorEmptyText}>No hay clientes disponibles</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={fetchClientes}
                  disabled={loadingClientes}>
                  <Ionicons name="refresh" size={16} color="white" style={{ marginRight: 4 }} />
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}
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
  retryButton: {
    backgroundColor: '#f59e0b',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  selectorLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  selectorLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  selectorEmpty: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  selectorEmptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

