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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AddProductModalProps {
  isVisible: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

const UNIDADES_MEDIDA = ['Kg', 'Pzas', 'Combo', 'Bolsa'];

export default function AddProductModal({ isVisible, onClose, onProductAdded }: AddProductModalProps) {
  const [descripcion, setDescripcion] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('');
  const [precio, setPrecio] = useState('');
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUnidadSelector, setShowUnidadSelector] = useState(false);

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
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              setImagenUri(result.assets[0].uri);
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
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              setImagenUri(result.assets[0].uri);
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

      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append('descripcion', descripcion.trim());
      formData.append('unidad_medida', unidadMedida.trim());
      formData.append('precio', precioNum.toString());

      // Si hay una imagen, agregarla al FormData
      if (imagenUri) {
        const filename = imagenUri.split('/').pop() || 'imagen.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('imagen', {
          uri: imagenUri,
          name: filename,
          type,
        } as any);
      }

      console.log('Intentando agregar producto a:', `${API_URL}/products`);

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      // No establecer Content-Type para FormData, el navegador lo hace automáticamente
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers,
        body: formData,
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
    setImagenUri(null);
    setError('');
    setShowUnidadSelector(false);
  };

  const selectUnidadMedida = (unidad: string) => {
    setUnidadMedida(unidad);
    setShowUnidadSelector(false);
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
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => !loading && setShowUnidadSelector(true)}
              disabled={loading}>
              <Text style={[styles.selectButtonText, !unidadMedida && styles.selectButtonPlaceholder]}>
                {unidadMedida || 'Selecciona una unidad de medida'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

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

            <Text style={styles.label}>Imagen (opcional)</Text>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={pickImage}
              disabled={loading}>
              <Ionicons name="image" size={24} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={styles.imagePickerText}>
                {imagenUri ? 'Cambiar Imagen' : 'Seleccionar Imagen'}
              </Text>
            </TouchableOpacity>

            {imagenUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imagenUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImagenUri(null)}
                  disabled={loading}>
                  <Ionicons name="close-circle" size={24} color="red" />
                </TouchableOpacity>
              </View>
            )}

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

      {/* Selector de unidad de medida */}
      {showUnidadSelector && (
        <View style={styles.selectorOverlay}>
          <TouchableOpacity
            style={styles.selectorBackdrop}
            activeOpacity={1}
            onPress={() => setShowUnidadSelector(false)}
          />
          <View style={styles.selectorContainer}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Selecciona Unidad de Medida</Text>
              <TouchableOpacity onPress={() => setShowUnidadSelector(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {UNIDADES_MEDIDA.map((unidad) => (
              <TouchableOpacity
                key={unidad}
                style={[
                  styles.selectorOption,
                  unidadMedida === unidad && styles.selectorOptionSelected,
                ]}
                onPress={() => selectUnidadMedida(unidad)}>
                <Text
                  style={[
                    styles.selectorOptionText,
                    unidadMedida === unidad && styles.selectorOptionTextSelected,
                  ]}>
                  {unidad}
                </Text>
                {unidadMedida === unidad && (
                  <Ionicons name="checkmark-circle" size={24} color="#f59e0b" />
                )}
              </TouchableOpacity>
            ))}
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
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    marginBottom: 15,
    backgroundColor: '#fffbf5',
  },
  imagePickerText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 4,
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

