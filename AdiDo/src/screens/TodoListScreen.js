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

const TodoListScreen = () => {
  const [todos, setTodos] = useState([]);
  const [inputText, setInputText] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    console.log('TodoListScreen: Setting up auth listener');
    // Listen for authentication state changes
    const unsubscribeAuth = AuthService.onAuthStateChanged((user) => {
      console.log('TodoListScreen: Auth state changed', user?.uid);
      setUser(user);
      if (user) {
        // Subscribe to real-time todos when user is authenticated
        console.log('TodoListScreen: Subscribing to todos for user:', user.uid);
        const unsubscribeTodos = SimpleFirebaseService.subscribeTodos(user.uid, (todos) => {
          console.log('TodoListScreen: Received todos:', todos);
          setTodos(todos);
        });
        
        // Store unsubscribe function to clean up later
        return () => {
          console.log('TodoListScreen: Unsubscribing from todos');
          unsubscribeTodos();
        };
      } else {
        console.log('TodoListScreen: No user, clearing todos');
        setTodos([]); // Clear todos when not authenticated
      }
    });

    return unsubscribeAuth;
  }, []);

  const addTodo = async () => {
    console.log('TodoListScreen: addTodo called', inputText, user?.uid);
    if (inputText.trim() && user) {
      try {
        const newTodo = {
          text: inputText.trim(),
          completed: false,
        };
        console.log('TodoListScreen: Adding todo:', newTodo);
        await SimpleFirebaseService.addTodo(newTodo, user.uid);
        setInputText('');
        console.log('TodoListScreen: Todo added successfully');
      } catch (error) {
        console.error('TodoListScreen: Error adding todo:', error);
        Alert.alert('Error', `Failed to add todo: ${error.message}`);
      }
    } else {
      console.log('TodoListScreen: Cannot add todo - missing text or user');
    }
  };

  const toggleTodo = async (id) => {
    console.log('TodoListScreen: toggleTodo called', id);
    try {
      const todo = todos.find(t => t.id === id);
      console.log('TodoListScreen: Found todo:', todo);
      await SimpleFirebaseService.updateTodo(id, { completed: !todo.completed });
      console.log('TodoListScreen: Todo toggled successfully');
    } catch (error) {
      console.error('TodoListScreen: Error toggling todo:', error);
      Alert.alert('Error', `Failed to update todo: ${error.message}`);
    }
  };

  const deleteTodo = async (id) => {
    console.log('TodoListScreen: deleteTodo called', id);
    
    // Use window.confirm for web compatibility
    const confirmed = window.confirm('Are you sure you want to delete this todo item?');
    
    if (confirmed) {
      try {
        console.log('TodoListScreen: Deleting todo:', id);
        await SimpleFirebaseService.deleteTodo(id);
        console.log('TodoListScreen: Todo deleted successfully');
      } catch (error) {
        console.error('TodoListScreen: Error deleting todo:', error);
        window.alert(`Failed to delete todo: ${error.message}`);
      }
    } else {
      console.log('TodoListScreen: Delete cancelled');
    }
  };

  const renderTodoItem = ({ item }) => (
    <View style={styles.todoItem}>
      <TouchableOpacity
        style={[styles.checkbox, item.completed && styles.checkboxChecked]}
        onPress={() => toggleTodo(item.id)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <Text style={[styles.todoText, item.completed && styles.todoTextCompleted]}>
        {item.text}
      </Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteTodo(item.id)}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Todo List</Text>
        <Text style={styles.counter}>{todos.filter(t => !t.completed).length} remaining</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new todo..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={addTodo}
        />
        <TouchableOpacity style={styles.addButton} onPress={addTodo}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={todos}
        renderItem={renderTodoItem}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
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
  addButton: {
    width: 50,
    height: 50,
    backgroundColor: '#007AFF',
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
  todoItem: {
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
    borderColor: '#007AFF',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
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

export default TodoListScreen;