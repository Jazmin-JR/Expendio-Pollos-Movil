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

interface AddClientModalProps {
  isVisible: boolean;
  onClose: () => void;
  onClientAdded: () => void;
}

export default function AddClientModal({ isVisible, onClose, onClientAdded }: AddClientModalProps) {
  const [nombre, setNombre] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddClient = async () => {
    if (!nombre.trim()) {
      setError('Por favor, ingresa el nombre del cliente.');
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

      const clientData: any = {
        nombre: nombre.trim(),
      };

      if (razonSocial.trim()) {
        clientData.razon_social = razonSocial.trim();
      }
      if (email.trim()) {
        clientData.email = email.trim();
      }
      if (telefono.trim()) {
        clientData.telefono = telefono.trim();
      }
      if (direccion.trim()) {
        clientData.direccion = direccion.trim();
      }

      console.log('Intentando agregar cliente a:', `${API_URL}/clients`);
      console.log('Datos enviados:', clientData);

      const response = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(clientData),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = 'Error al agregar cliente';
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
      Alert.alert('Éxito', 'Cliente agregado correctamente.');
      onClientAdded();
      onClose();
      resetForm();
    } catch (err) {
      let displayErrorMessage = 'Error de conexión. Verifica que el servidor esté corriendo.';
      if (err instanceof Error) {
        displayErrorMessage = err.message;
        console.error('Error al agregar cliente:', err);
      }
      setError(displayErrorMessage);
      Alert.alert('Error', displayErrorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setRazonSocial('');
    setEmail('');
    setTelefono('');
    setDireccion('');
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
            <Text style={styles.modalTitle}>Agregar Nuevo Cliente</Text>
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
              placeholder="Nombre del cliente"
              placeholderTextColor="#999"
              value={nombre}
              onChangeText={(text) => {
                setNombre(text);
                setError('');
              }}
              autoCapitalize="words"
              editable={!loading}
            />

            <Text style={styles.label}>Razón Social (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Razón social"
              placeholderTextColor="#999"
              value={razonSocial}
              onChangeText={(text) => {
                setRazonSocial(text);
                setError('');
              }}
              autoCapitalize="words"
              editable={!loading}
            />

            <Text style={styles.label}>Email (opcional)</Text>
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

            <Text style={styles.label}>Teléfono (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              placeholderTextColor="#999"
              value={telefono}
              onChangeText={(text) => {
                setTelefono(text);
                setError('');
              }}
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Text style={styles.label}>Dirección (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Dirección"
              placeholderTextColor="#999"
              value={direccion}
              onChangeText={(text) => {
                setDireccion(text);
                setError('');
              }}
              autoCapitalize="sentences"
              multiline
              numberOfLines={2}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAddClient}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="add-circle" size={22} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Agregar Cliente</Text>
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

