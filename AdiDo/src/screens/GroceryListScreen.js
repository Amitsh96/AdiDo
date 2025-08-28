import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SimpleFirebaseService } from '../services/SimpleFirebaseService';
import { AuthService } from '../services/AuthService';

const GroceryListScreen = () => {
  const [groceries, setGroceries] = useState([]);
  const [inputText, setInputText] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribeAuth = AuthService.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        // Subscribe to real-time groceries when user is authenticated
        const unsubscribeGroceries = SimpleFirebaseService.subscribeGroceries(user.uid, (groceries) => {
          setGroceries(groceries);
        });
        
        return () => unsubscribeGroceries();
      } else {
        setGroceries([]);
      }
    });

    return unsubscribeAuth;
  }, []);

  const addGrocery = async () => {
    if (inputText.trim() && user) {
      try {
        const newGrocery = {
          text: inputText.trim(),
          quantity: quantity || '1',
          completed: false,
        };
        await SimpleFirebaseService.addGrocery(newGrocery, user.uid);
        setInputText('');
        setQuantity('1');
      } catch (error) {
        Alert.alert('Error', 'Failed to add grocery item. Please try again.');
      }
    }
  };

  const toggleGrocery = async (id) => {
    try {
      const grocery = groceries.find(g => g.id === id);
      await SimpleFirebaseService.updateGrocery(id, { completed: !grocery.completed });
    } catch (error) {
      Alert.alert('Error', 'Failed to update grocery item. Please try again.');
    }
  };

  const deleteGrocery = async (id) => {
    console.log('GroceryListScreen: deleteGrocery called', id);
    
    // Use window.confirm for web compatibility
    const confirmed = window.confirm('Are you sure you want to delete this grocery item?');
    
    if (confirmed) {
      try {
        console.log('GroceryListScreen: Deleting grocery:', id);
        await SimpleFirebaseService.deleteGrocery(id);
        console.log('GroceryListScreen: Grocery deleted successfully');
      } catch (error) {
        console.error('GroceryListScreen: Error deleting grocery:', error);
        window.alert(`Failed to delete grocery item: ${error.message}`);
      }
    } else {
      console.log('GroceryListScreen: Delete cancelled');
    }
  };

  const clearAllGroceries = async () => {
    console.log('GroceryListScreen: clearAllGroceries called');
    
    if (groceries.length === 0) {
      window.alert('No grocery items to clear!');
      return;
    }
    
    const confirmed = window.confirm(`Are you sure you want to delete all ${groceries.length} grocery items?`);
    
    if (confirmed) {
      try {
        console.log('GroceryListScreen: Clearing all groceries, count:', groceries.length);
        
        // Delete all groceries one by one
        const deletePromises = groceries.map(grocery => 
          SimpleFirebaseService.deleteGrocery(grocery.id)
        );
        
        await Promise.all(deletePromises);
        console.log('GroceryListScreen: All groceries cleared successfully');
      } catch (error) {
        console.error('GroceryListScreen: Error clearing all groceries:', error);
        window.alert(`Failed to clear all grocery items: ${error.message}`);
      }
    } else {
      console.log('GroceryListScreen: Clear all cancelled');
    }
  };

  const renderGroceryItem = ({ item }) => (
    <View style={styles.groceryItem}>
      <TouchableOpacity
        style={[styles.checkbox, item.completed && styles.checkboxChecked]}
        onPress={() => toggleGrocery(item.id)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <View style={styles.itemInfo}>
        <Text style={[styles.groceryText, item.completed && styles.groceryTextCompleted]}>
          {item.text}
        </Text>
        <Text style={[styles.quantityText, item.completed && styles.quantityTextCompleted]}>
          Qty: {item.quantity}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteGrocery(item.id)}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Grocery List</Text>
          {groceries.length > 0 && (
            <TouchableOpacity style={styles.clearAllButton} onPress={clearAllGroceries}>
              <Text style={styles.clearAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.counter}>{groceries.filter(g => !g.completed).length} items to buy</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add grocery item..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={addGrocery}
        />
        <TextInput
          style={styles.quantityInput}
          placeholder="Qty"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.addButton} onPress={addGrocery}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groceries}
        renderItem={renderGroceryItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  clearAllButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  counter: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    marginRight: 10,
  },
  quantityInput: {
    width: 60,
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'white',
    marginRight: 10,
    textAlign: 'center',
  },
  addButton: {
    width: 50,
    height: 50,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#34C759',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#34C759',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  groceryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  groceryTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  quantityText: {
    fontSize: 12,
    color: '#666',
  },
  quantityTextCompleted: {
    color: '#999',
  },
  deleteButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default GroceryListScreen;