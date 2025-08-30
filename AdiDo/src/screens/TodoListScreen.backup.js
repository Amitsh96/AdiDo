import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
// Import conditionally for web compatibility
let DraggableFlatList;
try {
  DraggableFlatList = require('react-native-draggable-flatlist').default;
} catch (e) {
  // Fallback to regular FlatList for web
  DraggableFlatList = FlatList;
}
import { SimpleFirebaseService } from '../services/SimpleFirebaseService';
import { AuthService } from '../services/AuthService';
import { useTheme } from '../contexts/ThemeContext';

const TodoListScreen = () => {
  const [todos, setTodos] = useState([]);
  const [inputText, setInputText] = useState('');
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('personal');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [draggedItem, setDraggedItem] = useState(null);
  const theme = useTheme();

  const categories = ['personal', 'work', 'urgent'];
  const priorities = ['low', 'medium', 'high'];

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
        const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.order || 0)) : 0;
        const newTodo = {
          text: inputText.trim(),
          completed: false,
          category: selectedCategory,
          priority: selectedPriority,
          dueDate: dueDate ? new Date(dueDate) : null,
          order: maxOrder + 1,
        };
        console.log('TodoListScreen: Adding todo:', newTodo);
        await SimpleFirebaseService.addTodo(newTodo, user.uid);
        setInputText('');
        setDueDate('');
        setSelectedCategory('personal');
        setSelectedPriority('medium');
        setShowAddModal(false);
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

  const getFilteredTodos = () => {
    let filtered = todos;
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(todo => todo.category === filterCategory);
    }
    
    // Sort by order, then by priority, then by due date
    return filtered.sort((a, b) => {
      if ((a.order || 0) !== (b.order || 0)) {
        return (a.order || 0) - (b.order || 0);
      }
      
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate.seconds * 1000) - new Date(b.dueDate.seconds * 1000);
      }
      
      return 0;
    });
  };

  const formatDate = (date) => {
    if (!date) return null;
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };

  const getCategoryColor = (category) => {
    return theme.colors[category] || theme.colors.primary;
  };

  const handleDragEnd = async ({ data }) => {
    // Update local state immediately for responsive UI
    setTodos(data);
    
    // Update order in Firebase for each item
    try {
      const updatePromises = data.map((item, index) => 
        SimpleFirebaseService.updateTodo(item.id, { order: index })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating todo order:', error);
      // Optionally revert local state or show error
    }
  };

  const renderTodoItem = ({ item, drag, isActive }) => (
    <View style={[
      styles.todoItem, 
      { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      isActive && styles.activeItem
    ]}>
      <TouchableOpacity
        style={[
          styles.checkbox, 
          { borderColor: getCategoryColor(item.category) },
          item.completed && { backgroundColor: getCategoryColor(item.category) }
        ]}
        onPress={() => toggleTodo(item.id)}
      >
        {item.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      
      <View style={styles.todoContent}>
        <View style={styles.todoHeader}>
          <Text style={[
            styles.todoText, 
            { color: theme.colors.text },
            item.completed && styles.todoTextCompleted
          ]}>
            {item.text}
          </Text>
          <View style={[styles.priorityTag, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>
        
        <View style={styles.todoFooter}>
          <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          {item.dueDate && (
            <Text style={[styles.dueDate, { color: theme.colors.textSecondary }]}>
              Due: {formatDate(item.dueDate)}
            </Text>
          )}
        </View>
      </View>
      
      {drag && (
        <TouchableOpacity
          style={styles.dragHandle}
          onLongPress={drag}
        >
          <Text style={[styles.dragHandleText, { color: theme.colors.textSecondary }]}>⋮⋮</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteTodo(item.id)}
      >
        <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const filteredTodos = getFilteredTodos();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Todo List</Text>
          <TouchableOpacity 
            style={[styles.themeButton, { backgroundColor: theme.colors.primary }]}
            onPress={theme.toggleTheme}
          >
            <Text style={styles.themeButtonText}>{theme.isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.counter, { color: theme.colors.textSecondary }]}>
          {filteredTodos.filter(t => !t.completed).length} remaining
        </Text>
        
        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', ...categories].map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                { backgroundColor: filterCategory === category ? theme.colors.primary : theme.colors.surface }
              ]}
              onPress={() => setFilterCategory(category)}
            >
              <Text style={[
                styles.filterText,
                { color: filterCategory === category ? 'white' : theme.colors.text }
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addButtonText}>+ Add Todo</Text>
      </TouchableOpacity>

      <DraggableFlatList
        data={filteredTodos}
        renderItem={renderTodoItem}
        keyExtractor={(item) => item.id}
        onDragEnd={DraggableFlatList.name === 'FlatList' ? undefined : handleDragEnd}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Todo Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add New Todo</Text>
            
            <TextInput
              style={[styles.modalInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Enter todo text..."
              placeholderTextColor={theme.colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Category:</Text>
              <View style={styles.pickerContainer}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pickerOption,
                      { backgroundColor: selectedCategory === cat ? getCategoryColor(cat) : theme.colors.surface }
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[
                      styles.pickerText,
                      { color: selectedCategory === cat ? 'white' : theme.colors.text }
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Priority:</Text>
              <View style={styles.pickerContainer}>
                {priorities.map(pri => (
                  <TouchableOpacity
                    key={pri}
                    style={[
                      styles.pickerOption,
                      { backgroundColor: selectedPriority === pri ? getPriorityColor(pri) : theme.colors.surface }
                    ]}
                    onPress={() => setSelectedPriority(pri)}
                  >
                    <Text style={[
                      styles.pickerText,
                      { color: selectedPriority === pri ? 'white' : theme.colors.text }
                    ]}>
                      {pri}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputRow}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Due Date:</Text>
              <TextInput
                style={[styles.dateInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textSecondary}
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={addTodo}
              >
                <Text style={[styles.modalButtonText, { color: 'white' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 20,
  },
  counter: {
    fontSize: 16,
    marginTop: 5,
    marginBottom: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  addButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  todoContent: {
    flex: 1,
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    marginRight: 8,
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  todoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dueDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  dragHandle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  dragHandleText: {
    fontSize: 20,
    fontWeight: 'bold',
    transform: [{ rotate: '90deg' }],
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  deleteButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  activeItem: {
    transform: [{ scale: 1.02 }],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TodoListScreen;