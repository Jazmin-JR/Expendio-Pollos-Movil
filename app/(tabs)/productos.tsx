import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AddProductModal from '@/components/AddProductModal';
import { API_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Producto {
  id_producto: number;
  descripcion: string;
  unidad_medida: string;
  precio: number;
  imagen: string | null;
}

export default function ProductosScreen() {
  const [isModalVisible, setModalVisible] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchProductos = async () => {
    try {
      setError('');
      const token = await AsyncStorage.getItem('authToken');

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/products`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Error al obtener los productos');
      }

      const data = await response.json();
      console.log('Respuesta del servidor:', JSON.stringify(data, null, 2));
      
      // Asegurarse de que siempre sea un array
      let productosArray: Producto[] = [];
      
      if (Array.isArray(data)) {
        productosArray = data;
      } else if (data && Array.isArray(data.products)) {
        productosArray = data.products;
      } else if (data && Array.isArray(data.data)) {
        productosArray = data.data;
      } else if (data && typeof data === 'object') {
        // Si es un objeto con productos individuales, convertirlo a array
        productosArray = Object.values(data).filter((item): item is Producto => 
          typeof item === 'object' && item !== null && 'id_producto' in item
        ) as Producto[];
      }
      
      // Normalizar los datos: asegurar que precio sea siempre un número
      productosArray = productosArray.map((producto) => ({
        ...producto,
        precio: typeof producto.precio === 'number' 
          ? producto.precio 
          : parseFloat(String(producto.precio || '0')) || 0,
      }));
      
      setProductos(productosArray);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar productos';
      setError(errorMessage);
      // Asegurarse de que productos siempre sea un array, incluso en caso de error
      setProductos([]);
      console.error('Error al obtener productos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleProductAdded = () => {
    // Recargar la lista de productos
    fetchProductos();
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProductos();
  };

  const getImageUrl = (imagen: string | null) => {
    if (!imagen) return null;
    // Si la imagen es una URL completa, usarla directamente
    if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
      return imagen;
    }
    // Si es una ruta relativa, construir la URL completa
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${imagen.startsWith('/') ? imagen : '/' + imagen}`;
  };

  // Asegurarse de que productos siempre sea un array antes de renderizar
  const productosList = Array.isArray(productos) ? productos : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="cube" size={32} color="#f59e0b" />
          <Text style={styles.title}>Productos</Text>
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
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff3333" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProductos}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : productosList.length === 0 ? (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No hay productos disponibles</Text>
            <Text style={styles.emptySubtext}>Presiona "Agregar" para crear uno nuevo</Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {productosList.map((producto) => (
            <View key={producto.id_producto} style={styles.productCard}>
              <View style={styles.productContent}>
                {producto.imagen ? (
                  <Image
                    source={{ uri: getImageUrl(producto.imagen) || undefined }}
                    style={styles.productImage}
                    contentFit="cover"
                    placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                    transition={200}
                  />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name="image-outline" size={40} color="#ccc" />
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productDescription}>{producto.descripcion}</Text>
                  <View style={styles.productDetails}>
                    <View style={styles.productDetailRow}>
                      <Ionicons name="scale" size={16} color="#666" />
                      <Text style={styles.productDetailText}>{producto.unidad_medida}</Text>
                    </View>
                    <View style={styles.productDetailRow}>
                      <Ionicons name="cash" size={16} color="#f59e0b" />
                      <Text style={styles.productPrice}>
                        ${(producto.precio || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <AddProductModal
        isVisible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onProductAdded={handleProductAdded}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
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
  productCard: {
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
  productContent: {
    flexDirection: 'row',
    padding: 16,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  productDescription: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  productDetails: {
    gap: 8,
  },
  productDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productDetailText: {
    fontSize: 14,
    color: '#666',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
});

