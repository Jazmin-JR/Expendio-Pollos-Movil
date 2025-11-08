import React, { useState } from 'react';
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

interface AddProductModalProps {
  isVisible: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

export default function AddProductModal({ isVisible, onClose, onProductAdded }: AddProductModalProps) {
  const [descripcion, setDescripcion] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagen, setImagen] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddProduct = async () => {
    if (!descripcion.trim() || !unidadMedida.trim() || !precio.trim()) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum <= 0) {
      setError('Por favor, ingresa un precio válido.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const productData = {
        descripcion: descripcion.trim(),
        unidad_medida: unidadMedida.trim(),
        precio: precioNum,
        imagen: imagen.trim() || null,
      };

      console.log('Intentando agregar producto a:', `${API_URL}/products`);
      console.log('Datos enviados:', productData);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(productData),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Error al agregar producto';
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
      Alert.alert('Éxito', 'Producto agregado correctamente.');
      onProductAdded();
      onClose();
      resetForm();
    } catch (err) {
      let displayErrorMessage = 'Error de conexión. Verifica que el servidor esté corriendo.';
      if (err instanceof Error) {
        displayErrorMessage = err.message;
        console.error('Error al agregar producto:', err);
      }
      setError(displayErrorMessage);
      Alert.alert('Error', displayErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescripcion('');
    setUnidadMedida('');
    setPrecio('');
    setImagen('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
            <Text style={styles.modalTitle}>Agregar Nuevo Producto</Text>
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

            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={styles.input}
              placeholder="Descripción del producto"
              placeholderTextColor="#999"
              value={descripcion}
              onChangeText={(text) => {
                setDescripcion(text);
                setError('');
              }}
              autoCapitalize="sentences"
              editable={!loading}
            />

            <Text style={styles.label}>Unidad de Medida *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: kg, unidad, litro"
              placeholderTextColor="#999"
              value={unidadMedida}
              onChangeText={(text) => {
                setUnidadMedida(text);
                setError('');
              }}
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={styles.label}>Precio *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#999"
              value={precio}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                setPrecio(cleaned);
                setError('');
              }}
              keyboardType="numeric"
              editable={!loading}
            />

            <Text style={styles.label}>URL de Imagen (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://ejemplo.com/imagen.jpg"
              placeholderTextColor="#999"
              value={imagen}
              onChangeText={(text) => {
                setImagen(text);
                setError('');
              }}
              autoCapitalize="none"
              keyboardType="url"
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAddProduct}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="add-circle" size={22} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Agregar Producto</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
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
});

