import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import TodoListScreen from './TodoListScreen';
import GroceryListScreen from './GroceryListScreen';
import EventsScreen from './EventsScreen';
import ProfileScreen from './ProfileScreen';

const MainScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Todo');
  const tabs = [
    { id: 'Todo', title: 'Todo', component: TodoListScreen },
    { id: 'Grocery', title: 'Grocery', component: GroceryListScreen },
    { id: 'Events', title: 'Events', component: EventsScreen },
    { id: 'Profile', title: 'Profile', component: ProfileScreen },
  ];

  const renderActiveScreen = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    if (!activeTabData) return null;
    
    const Component = activeTabData.component;
    return <Component navigation={navigation} />;
  };

  return (
    <View style={styles.container}>
      {/* Top Tab Bar */}
      <View style={styles.topTabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Screen Content */}
      <View style={styles.screenContainer}>
        {renderActiveScreen()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingTop: 50, // Space for status bar
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 4,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#007AFF',
  },
  screenContainer: {
    flex: 1,
  },
});

export default MainScreen;