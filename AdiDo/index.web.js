// Import Firebase directly
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, getDocs } from 'firebase/firestore';

console.log('Loading AdiDo...');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAtFFJIFHxqFW54WliDHcWo0_3YQfClQBY",
  authDomain: "adido-3155.firebaseapp.com",
  projectId: "adido-3155",
  storageBucket: "adido-3155.firebasestorage.app",
  messagingSenderId: "175404203921",
  appId: "1:175404203921:web:da66b9aecb5dd2a9a82430"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global state
let currentUser = null;
let todos = [];
let groceries = [];
let events = [];
let tags = [];
let isDarkMode = false;
let filterCategory = 'all';
let showAddTodoModal = false;
let showTagModal = false;
let editingTodo = null; // Todo currently being edited



// Create the main app HTML
function createApp() {
  // Add responsive styles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    @media (max-width: 480px) {
      .grocery-controls-container {
        flex-direction: column !important;
        gap: 8px !important;
      }
      .grocery-controls-container > div:first-child {
        max-width: 100% !important;
        min-width: auto !important;
      }
      .grocery-controls-container > button {
        width: 100% !important;
        max-width: none !important;
      }
    }
    * {
      box-sizing: border-box;
    }
    body, html {
      overflow-x: hidden;
      max-width: 100vw;
    }
    #app {
      overflow-x: hidden;
      max-width: 100vw;
    }
    @media (max-width: 480px) {
      #content {
        padding: 16px !important;
      }
    }
  `;
  document.head.appendChild(styleElement);
  
  const root = document.getElementById('root');
  root.innerHTML = `
    <div id="app" style="
      min-height: 100vh; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a202c;
    ">
      <!-- Login Screen -->
      <div id="loginScreen" style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        min-height: 100vh;
        position: relative;
      ">
        <div style="
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          padding: 48px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          width: 100%;
          max-width: 400px;
          text-align: center;
        ">
          <div style="
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 16px;
            margin: 0 auto 24px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
          ">📋</div>
          <h1 style="
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
          ">AdiDo</h1>
          <p style="
            font-size: 16px;
            color: #64748b;
            margin-bottom: 32px;
            font-weight: 400;
          ">Your intelligent task & grocery companion</p>
          
          <div style="margin-bottom: 16px;">
        
            <input type="email" id="emailInput" placeholder="Email address" style="
              width: 100%;
              height: 56px;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 0 20px;
              margin-bottom: 16px;
              background-color: #f8fafc;
              font-size: 16px;
              transition: all 0.2s;
              box-sizing: border-box;
              outline: none;
            ">
            
            <input type="password" id="passwordInput" placeholder="Password" style="
              width: 100%;
              height: 56px;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 0 20px;
              margin-bottom: 24px;
              background-color: #f8fafc;
              font-size: 16px;
              transition: all 0.2s;
              box-sizing: border-box;
              outline: none;
            ">
        
            <button id="authButton" style="
              width: 100%;
              height: 56px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 16px;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            ">Sign In</button>
            
            <button id="switchModeButton" style="
              background: none;
              border: none;
              color: #667eea;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            ">Don't have an account? Sign Up</button>
          </div>
        
          <div id="authError" style="
            color: #ef4444;
            font-size: 14px;
            margin-top: 12px;
            display: none;
            font-weight: 500;
          "></div>
        </div>
      </div>

      <!-- Main Screen -->
      <div id="mainScreen" style="
        display: none;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      ">
        <div id="navigation" style="
          display: flex;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          padding: 12px 8px;
          position: sticky;
          top: 0;
          z-index: 10;
          gap: 6px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        ">
          <button class="nav-tab active" data-tab="todos" style="
            flex: 1;
            padding: 12px 20px;
            border: none;
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            color: white;
            font-size: 14px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          ">📝 Todo</button>
          <button class="nav-tab" data-tab="grocery" style="
            flex: 1;
            padding: 14px 20px;
            border: none;
            background: rgba(255, 255, 255, 0.15);
            color: #1a202c;
            font-size: 14px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
          ">🛒 Grocery</button>
          <button class="nav-tab" data-tab="events" style="
            flex: 1;
            padding: 14px 20px;
            border: none;
            background: rgba(255, 255, 255, 0.15);
            color: #1a202c;
            font-size: 14px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
          ">📅 Events</button>
          <button class="nav-tab" data-tab="profile" style="
            flex: 1;
            padding: 14px 20px;
            border: none;
            background: rgba(255, 255, 255, 0.15);
            color: #1a202c;
            font-size: 14px;
            font-weight: 600;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
          ">👤 Profile</button>
        </div>
        
        <div id="content" style="
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        ">
          <!-- Content will be loaded here -->
        </div>
      </div>
    </div>
  `;

  setupEventListeners();
}

// Setup navigation event listeners
function setupNavigationListeners() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabId = e.target.dataset.tab;
      
      // Update active states
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(255, 255, 255, 0.15)';
        t.style.color = isDarkMode ? '#e2e8f0' : '#1a202c';
        t.style.boxShadow = 'none';
      });
      
      e.target.classList.add('active');
      e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
      e.target.style.color = 'white';
      e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
      
      loadTabContent(tabId);
    });
  });
}

// Event listeners
function setupEventListeners() {
  let isSignUp = false;
  
  // Auth button
  document.getElementById('authButton').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('authError');
    
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }

    try {
      console.log('Attempting authentication...', isSignUp ? 'Sign Up' : 'Sign In', email);
      
      if (isSignUp) {
        console.log('Creating new user...');
        const result = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Sign up successful:', result.user.uid);
        showError('Account created successfully!', false);
      } else {
        console.log('Signing in existing user...');
        const result = await signInWithEmailAndPassword(auth, email, password);
        console.log('Sign in successful:', result.user.uid);
      }
    } catch (error) {
      console.error('Authentication error:', error.code, error.message);
      let message = 'Authentication failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/missing-password') {
        message = 'Please enter a password.';
      } else {
        message = `Error: ${error.message}`;
      }
      
      showError(message);
    }
  });
  
  // Switch mode button
  document.getElementById('switchModeButton').addEventListener('click', () => {
    isSignUp = !isSignUp;
    const authButton = document.getElementById('authButton');
    const switchButton = document.getElementById('switchModeButton');
    
    if (isSignUp) {
      authButton.textContent = 'Sign Up';
      switchButton.textContent = 'Already have an account? Sign In';
    } else {
      authButton.textContent = 'Sign In';
      switchButton.textContent = "Don't have an account? Sign Up";
    }
  });

  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      // Update active tab
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = 'rgba(255, 255, 255, 0.15)';
        t.style.color = '#1a202c';
        t.style.boxShadow = 'none';
      });
      
      e.target.classList.add('active');
      e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
      e.target.style.color = 'white';
      e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
      
      // Load content
      loadTabContent(e.target.dataset.tab);
    });
  });
}

function getAllCategories() {
  const defaultCategories = ['all', 'personal', 'work', 'urgent'];
  const disabledTags = getDisabledTags();
  const enabledDefaults = defaultCategories.filter(cat => !disabledTags.includes(cat));
  const customTagNames = tags.map(tag => tag.name);
  return [...enabledDefaults, ...customTagNames];
}

function getDisabledTags() {
  try {
    const disabled = localStorage.getItem('disabledTags');
    return disabled ? JSON.parse(disabled) : [];
  } catch (error) {
    console.error('Error reading disabled tags:', error);
    return [];
  }
}

function setDisabledTags(disabledTags) {
  try {
    localStorage.setItem('disabledTags', JSON.stringify(disabledTags));
  } catch (error) {
    console.error('Error saving disabled tags:', error);
  }
}

function disableDefaultTag(tagName) {
  const disabledTags = getDisabledTags();
  if (!disabledTags.includes(tagName)) {
    disabledTags.push(tagName);
    setDisabledTags(disabledTags);
  }
}

function restoreDefaultTag(tagName) {
  const disabledTags = getDisabledTags();
  const index = disabledTags.indexOf(tagName);
  if (index > -1) {
    disabledTags.splice(index, 1);
    setDisabledTags(disabledTags);
    renderExistingTags();
    refreshCurrentView();
  }
}

function refreshCurrentView() {
  // Refresh the current tab to reflect tag changes
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab && activeTab.dataset.tab === 'todos') {
    renderTodos();
  }
}

// Make functions available globally
window.disableDefaultTag = disableDefaultTag;
window.restoreDefaultTag = restoreDefaultTag;
window.refreshCurrentView = refreshCurrentView;

function showError(message, isError = true) {
  const errorDiv = document.getElementById('authError');
  errorDiv.textContent = message;
  errorDiv.style.color = isError ? '#FF3B30' : '#34C759';
  errorDiv.style.display = 'block';
}

function updateThemeStyles() {
  // Update main screen background
  const mainScreen = document.getElementById('mainScreen');
  if (mainScreen) {
    mainScreen.style.background = isDarkMode 
      ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  }

  // Update navigation bar
  const navigation = document.getElementById('navigation');
  if (navigation) {
    navigation.style.background = isDarkMode 
      ? 'rgba(20, 30, 48, 0.95)' 
      : 'rgba(255, 255, 255, 0.95)';
    navigation.style.borderBottom = isDarkMode 
      ? '1px solid rgba(51, 65, 85, 0.8)' 
      : '1px solid rgba(226, 232, 240, 0.8)';
    navigation.style.boxShadow = isDarkMode 
      ? '0 4px 20px rgba(0, 0, 0, 0.3)' 
      : '0 4px 20px rgba(0, 0, 0, 0.1)';
  }

  // Update inactive tab styles
  document.querySelectorAll('.nav-tab:not(.active)').forEach(tab => {
    tab.style.background = isDarkMode 
      ? 'rgba(51, 65, 85, 0.5)' 
      : 'rgba(255, 255, 255, 0.15)';
    tab.style.color = isDarkMode ? '#e2e8f0' : '#1a202c';
  });
}

function showMainScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'block';
  updateThemeStyles();
  setupNavigationListeners();
  loadTabContent('todos');
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainScreen').style.display = 'none';
}

function loadTabContent(tab) {
  const content = document.getElementById('content');
  
  if (tab === 'todos') {
    const bgColor = isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const textColor = isDarkMode ? '#ffffff' : '#1a202c';
    const secondaryTextColor = isDarkMode ? '#b3b3b3' : '#64748b';
    
    content.innerHTML = `
      <div style="
        background: ${bgColor};
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        margin-bottom: 24px;
        transition: all 0.3s ease;
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        ">
          <div style="display: flex; align-items: center;">
            <div style="
              width: 48px;
              height: 48px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 16px;
            ">
              <span style="font-size: 20px;">🎯</span>
            </div>
            <div>
              <h2 style="
                color: ${textColor};
                margin: 0;
                font-size: 24px;
                font-weight: 700;
              ">To-do list</h2>
              <p style="
                color: ${secondaryTextColor};
                margin: 4px 0 0 0;
                font-size: 14px;
              ">${todos.filter(t => !t.completed).length} remaining tasks</p>
            </div>
          </div>
          
        </div>

        <!-- Category Filter Buttons -->
        <div style="
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: center;
        ">
          ${getAllCategories().map(category => `
            <button class="category-filter" data-category="${category}" style="
              padding: 8px 16px;
              border: none;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              text-transform: capitalize;
              background: ${filterCategory === category ? '#667eea' : (isDarkMode ? '#404040' : '#f1f5f9')};
              color: ${filterCategory === category ? 'white' : textColor};
            ">${category}</button>
          `).join('')}
          <button id="manageTagsBtn" style="
            padding: 8px 16px;
            border: none;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            background: #667eea;
            color: white;
          ">+ Tags</button>
        </div>
        
        <button id="addTodoBtn" style="
          width: 100%;
          height: 56px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        ">✨ Add New Todo</button>
      </div>
      
      <div id="todosList" style="
        display: flex;
        flex-direction: column;
        gap: 12px;
      "></div>

      <!-- Add Todo Modal -->
      <div id="addTodoModal" style="
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
      ">
        <div style="
          background: ${bgColor};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 32px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        ">
          <h3 style="
            color: ${textColor};
            margin: 0 0 24px 0;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
          ">Add New Todo</h3>
          
          <textarea id="todoTextInput" placeholder="Enter todo text..." style="
            width: 100%;
            min-height: 80px;
            border: 2px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
            border-radius: 12px;
            padding: 16px;
            background: ${isDarkMode ? '#2c2c2c' : '#f8fafc'};
            color: ${textColor};
            font-size: 16px;
            font-family: inherit;
            resize: vertical;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 20px;
          "></textarea>

          <div style="margin-bottom: 20px;">
            <label style="
              display: block;
              color: ${textColor};
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 8px;
            ">Category:</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${getAllCategories().filter(cat => cat !== 'all').map(category => `
                <button class="modal-category-btn" data-category="${category}" style="
                  padding: 8px 16px;
                  border: none;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-transform: capitalize;
                  background: ${isDarkMode ? '#404040' : '#f1f5f9'};
                  color: ${textColor};
                ">${category}</button>
              `).join('')}
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="
              display: block;
              color: ${textColor};
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 8px;
            ">Priority:</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="modal-priority-btn" data-priority="low" style="
                  padding: 8px 16px;
                  border: none;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-transform: capitalize;
                  background: ${isDarkMode ? '#404040' : '#f1f5f9'};
                  color: ${textColor};
                ">Low</button>
                <button class="modal-priority-btn" data-priority="medium" style="
                  padding: 8px 16px;
                  border: none;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-transform: capitalize;
                  background: ${isDarkMode ? '#404040' : '#f1f5f9'};
                  color: ${textColor};
                ">Medium</button>
                <button class="modal-priority-btn" data-priority="high" style="
                  padding: 8px 16px;
                  border: none;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-transform: capitalize;
                  background: ${isDarkMode ? '#404040' : '#f1f5f9'};
                  color: ${textColor};
                ">High</button>
            </div>
          </div>

          <div style="margin-bottom: 24px;">
            <label style="
              display: block;
              color: ${textColor};
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 8px;
            ">Due Date (optional):</label>
            <input type="date" id="todoDueDateInput" style="
              width: 100%;
              height: 48px;
              border: 2px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
              border-radius: 12px;
              padding: 0 16px;
              background: ${isDarkMode ? '#2c2c2c' : '#f8fafc'};
              color: ${textColor};
              font-size: 16px;
              outline: none;
              box-sizing: border-box;
            ">
          </div>

          <div style="
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          ">
            <button id="cancelTodoBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              background: ${isDarkMode ? '#404040' : '#f1f5f9'};
              color: ${textColor};
            ">Cancel</button>
            <button id="saveTodoBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            ">Add Todo</button>
          </div>
        </div>
      </div>

      <!-- Tag Management Modal -->
      <div id="tagManagementModal" style="
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
      ">
        <div style="
          background: ${bgColor};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 32px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        ">
          <h3 style="
            color: ${textColor};
            margin: 0 0 24px 0;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
          ">Manage Tags</h3>
          
          <!-- Existing Tags -->
          <div style="margin-bottom: 24px;">
            <label style="
              display: block;
              color: ${textColor};
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 12px;
            ">Existing Tags:</label>
            <div id="existingTagsList" style="
              max-height: 120px;
              overflow-y: auto;
              margin-bottom: 16px;
            "></div>
          </div>

          <!-- Add New Tag -->
          <div style="margin-bottom: 24px;">
            <label style="
              display: block;
              color: ${textColor};
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 8px;
            ">Add New Tag:</label>
            <input type="text" id="newTagNameInput" placeholder="Enter tag name..." style="
              width: 100%;
              height: 48px;
              border: 2px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
              border-radius: 12px;
              padding: 0 16px;
              background: ${isDarkMode ? '#2c2c2c' : '#f8fafc'};
              color: ${textColor};
              font-size: 16px;
              outline: none;
              box-sizing: border-box;
              margin-bottom: 16px;
            ">
            
            <label style="
              display: block;
              color: ${textColor};
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 8px;
            ">Color:</label>
            <div id="colorOptions" style="
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
              margin-bottom: 16px;
            ">
              ${['#667eea', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#2196f3', '#00bcd4', '#ff5722'].map((color, index) => `
                <button class="color-option" data-color="${color}" style="
                  width: 32px;
                  height: 32px;
                  border-radius: 16px;
                  border: 2px solid ${index === 0 ? '#333' : 'transparent'};
                  background-color: ${color};
                  cursor: pointer;
                  transition: all 0.2s;
                "></button>
              `).join('')}
            </div>
          </div>

          <div style="
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          ">
            <button id="closeTagModalBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              background: ${isDarkMode ? '#404040' : '#f1f5f9'};
              color: ${textColor};
            ">Close</button>
            <button id="addNewTagBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            ">Add Tag</button>
          </div>
        </div>
      </div>

      <!-- Edit Todo Modal -->
      <div id="editTodoModal" style="
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
      ">
        <div style="
          background: ${bgColor};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 32px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        ">
          <h3 style="
            color: ${textColor};
            margin: 0 0 24px 0;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
          ">Edit Todo</h3>
          
          <textarea id="editTodoTextInput" placeholder="Enter todo text..." style="
            width: 100%;
            min-height: 80px;
            border: 2px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
            border-radius: 12px;
            padding: 16px;
            background: ${isDarkMode ? '#2c2c2c' : '#f8fafc'};
            color: ${textColor};
            font-size: 16px;
            font-family: inherit;
            resize: vertical;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 20px;
          "></textarea>

          <div style="margin-bottom: 20px;">
            <label style="
              display: block;
              color: ${textColor};
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 8px;
            ">Category:</label>
            <div id="editCategoryButtons" style="display: flex; gap: 8px; flex-wrap: wrap;">
              <!-- Category buttons will be populated dynamically -->
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <label style="
              display: block;
              color: ${textColor};
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 8px;
            ">Priority:</label>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="edit-priority-btn" data-priority="low" style="
                  padding: 8px 16px;
                  border: none;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-transform: capitalize;
                  background: ${isDarkMode ? '#404040' : '#f1f5f9'};
                  color: ${textColor};
                ">Low</button>
                <button class="edit-priority-btn" data-priority="medium" style="
                  padding: 8px 16px;
                  border: none;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-transform: capitalize;
                  background: ${isDarkMode ? '#404040' : '#f1f5f9'};
                  color: ${textColor};
                ">Medium</button>
                <button class="edit-priority-btn" data-priority="high" style="
                  padding: 8px 16px;
                  border: none;
                  border-radius: 20px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                  text-transform: capitalize;
                  background: ${isDarkMode ? '#404040' : '#f1f5f9'};
                  color: ${textColor};
                ">High</button>
            </div>
          </div>

          <div style="margin-bottom: 24px;">
            <label style="
              display: block;
              color: ${textColor};
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 8px;
            ">Due Date (optional):</label>
            <input type="date" id="editTodoDueDateInput" style="
              width: 100%;
              height: 48px;
              border: 2px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
              border-radius: 12px;
              padding: 0 16px;
              background: ${isDarkMode ? '#2c2c2c' : '#f8fafc'};
              color: ${textColor};
              font-size: 16px;
              outline: none;
              box-sizing: border-box;
            ">
          </div>

          <div style="
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          ">
            <button id="cancelEditTodoBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              background: ${isDarkMode ? '#404040' : '#f1f5f9'};
              color: ${textColor};
            ">Cancel</button>
            <button id="saveEditTodoBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            ">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    
    // Setup enhanced todo event listeners
    setupTodoEventListeners();
    renderTodos();
    
  } else if (tab === 'grocery') {
    content.innerHTML = `
      <div style="
        background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
        margin-bottom: 24px;
      ">
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        ">
          <div style="
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
          ">
            <span style="font-size: 20px;">🛒</span>
          </div>
          <h2 style="
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          ">Shopping List</h2>
        </div>
        
        <div style="
          margin-bottom: 24px;
        ">
          <input type="text" id="groceryInput" placeholder="What do you need to buy?" style="
            width: 100%;
            height: 56px;
            border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 12px;
            padding: 0 20px;
            background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            font-size: 16px;
            transition: all 0.2s;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 12px;
          ">
          
          <div class="grocery-controls-container" style="
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
          ">
            <div style="
              display: flex;
              align-items: center;
              background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
              border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
              border-radius: 12px;
              height: 56px;
              padding: 0 4px;
              flex: 1;
              min-width: 140px;
              max-width: 160px;
            ">
              <button id="quantityDownBtn" style="
                width: 40px;
                height: 48px;
                border: none;
                background: none;
                color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                transition: all 0.2s;
              ">−</button>
              <input type="text" id="quantityInput" placeholder="1" value="1" style="
                flex: 1;
                height: 48px;
                border: none;
                background: none;
                padding: 0;
                text-align: center;
                font-size: 16px;
                font-weight: 600;
                outline: none;
                color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
                min-width: 0;
              ">
              <button id="quantityUpBtn" style="
                width: 40px;
                height: 48px;
                border: none;
                background: none;
                color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                transition: all 0.2s;
              ">+</button>
            </div>
            
            <button id="addGroceryBtn" style="
              width: 56px;
              height: 56px;
              background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
              color: white;
              border: none;
              border-radius: 12px;
              font-size: 20px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            ">+</button>
          </div>
        </div>
      </div>
      <div id="groceriesList" style="
        display: flex;
        flex-direction: column;
        gap: 12px;
      "></div>
    `;
    
    document.getElementById('addGroceryBtn').addEventListener('click', addGrocery);
    document.getElementById('groceryInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addGrocery();
    });
    
    // Quantity control event listeners
    document.getElementById('quantityUpBtn').addEventListener('click', () => {
      const quantityInput = document.getElementById('quantityInput');
      let currentValue = parseInt(quantityInput.value) || 1;
      quantityInput.value = currentValue + 1;
    });
    
    document.getElementById('quantityDownBtn').addEventListener('click', () => {
      const quantityInput = document.getElementById('quantityInput');
      let currentValue = parseInt(quantityInput.value) || 1;
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
      }
    });
    
    // Ensure only numbers in quantity input
    document.getElementById('quantityInput').addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^0-9]/g, '');
      if (value === '' || parseInt(value) < 1) {
        value = '1';
      }
      e.target.value = value;
    });
    
    renderGroceries();
    
  } else if (tab === 'events') {
    content.innerHTML = `
      <div style="
        background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
        margin-bottom: 24px;
      ">
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        ">
          <div style="
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
          ">
            <span style="font-size: 20px;">📅</span>
          </div>
          <h2 style="
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          ">Events</h2>
        </div>
        
        <div style="
          margin-bottom: 24px;
        ">
        <input type="text" id="eventNameInput" placeholder="Event name..." style="
          width: 100%;
          height: 56px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 20px;
          background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 16px;
        ">
        
        <textarea id="eventDescriptionInput" placeholder="Event description..." style="
          width: 100%;
          height: 80px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 16px 20px;
          background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          transition: all 0.2s;
          outline: none;
          resize: vertical;
          font-family: inherit;
          box-sizing: border-box;
          margin-bottom: 16px;
        "></textarea>
        
        <input type="text" id="eventLocationInput" placeholder="Location..." style="
          width: 100%;
          height: 56px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 20px;
          background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 16px;
        ">
        
        <div style="display: flex; gap: 12px; margin-bottom: 24px; align-items: center;">
          <input type="date" id="eventDateInput" style="
            flex: 1;
            height: 56px;
            border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 12px;
            padding: 0 20px;
            background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            font-size: 16px;
            transition: all 0.2s;
            outline: none;
            box-sizing: border-box;
          ">
          <input type="time" id="eventTimeInput" style="
            flex: 1;
            height: 56px;
            border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 12px;
            padding: 0 20px;
            background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            font-size: 16px;
            transition: all 0.2s;
            outline: none;
            box-sizing: border-box;
          ">
        </div>
        
        <button id="addEventBtn" style="
          width: 100%;
          height: 56px;
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">+ Add Event</button>
        </div>
      </div>
      <div id="eventsList" style="
        display: flex;
        flex-direction: column;
        gap: 12px;
      "></div>

      <!-- Edit Event Modal -->
      <div id="editEventModal" style="
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
      ">
        <div style="
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 32px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        ">
          <h3 style="
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            margin: 0 0 24px 0;
            font-size: 24px;
            font-weight: 700;
            text-align: center;
          ">Edit Event</h3>
          
          <input type="text" id="editEventNameInput" placeholder="Event name..." style="
            width: 100%;
            height: 56px;
            border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 12px;
            padding: 0 20px;
            background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            font-size: 16px;
            transition: all 0.2s;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 16px;
          ">
          
          <textarea id="editEventDescriptionInput" placeholder="Event description..." style="
            width: 100%;
            height: 80px;
            border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 12px;
            padding: 16px 20px;
            background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            font-size: 16px;
            transition: all 0.2s;
            outline: none;
            resize: vertical;
            font-family: inherit;
            box-sizing: border-box;
            margin-bottom: 16px;
          "></textarea>
          
          <input type="text" id="editEventLocationInput" placeholder="Location..." style="
            width: 100%;
            height: 56px;
            border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 12px;
            padding: 0 20px;
            background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            font-size: 16px;
            transition: all 0.2s;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 16px;
          ">
          
          <div style="display: flex; gap: 12px; margin-bottom: 24px; align-items: center;">
            <input type="date" id="editEventDateInput" style="
              flex: 1;
              height: 56px;
              border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
              border-radius: 12px;
              padding: 0 20px;
              background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
              font-size: 16px;
              transition: all 0.2s;
              outline: none;
              box-sizing: border-box;
            ">
            <input type="time" id="editEventTimeInput" style="
              flex: 1;
              height: 56px;
              border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
              border-radius: 12px;
              padding: 0 20px;
              background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
              font-size: 16px;
              transition: all 0.2s;
              outline: none;
              box-sizing: border-box;
            ">
          </div>

          <div style="
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          ">
            <button id="cancelEditEventBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              background: ${isDarkMode ? '#404040' : '#f1f5f9'};
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            ">Cancel</button>
            <button id="saveEditEventBtn" style="
              padding: 12px 24px;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
              color: white;
              box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
            ">Save Changes</button>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('addEventBtn').addEventListener('click', addEvent);
    document.getElementById('eventNameInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addEvent();
    });
    
    renderEvents();
    
  } else if (tab === 'profile') {
    content.innerHTML = `
      <div style="
        background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 32px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
        margin-bottom: 24px;
      ">
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 24px;
        ">
          <div style="
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 16px;
          ">
            <span style="font-size: 20px;">👤</span>
          </div>
          <h2 style="
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          ">Profile</h2>
        </div>
        
        <div style="
          text-align: center;
          margin-bottom: 24px;
        ">
          <h3 style="
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            margin-bottom: 8px;
            font-size: 20px;
            font-weight: 600;
          ">Welcome, ${currentUser?.email || 'User'}!</h3>
          <p style="
            color: ${isDarkMode ? '#94a3b8' : '#64748b'};
            margin: 0;
            font-size: 16px;
          ">Shared with your partner</p>
        </div>
        
        <!-- Dark Mode Toggle -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding: 20px;
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)'};
          border-radius: 16px;
          border: 1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.5)'};
        ">
          <div>
            <h4 style="
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
              margin: 0 0 4px 0;
              font-size: 16px;
              font-weight: 600;
            ">Dark Mode</h4>
            <p style="
              color: ${isDarkMode ? '#94a3b8' : '#64748b'};
              margin: 0;
              font-size: 14px;
            ">Switch between light and dark themes</p>
          </div>
          <button id="themeToggle" style="
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          ">${isDarkMode ? '☀️' : '🌙'}</button>
        </div>
      
        <button id="logoutBtn" style="
          width: 100%;
          height: 56px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">Sign Out</button>
      </div>
    `;
    
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
    
    // Setup theme toggle event listener
    document.getElementById('themeToggle').addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      localStorage.setItem('darkMode', isDarkMode);
      updateThemeStyles();
      loadTabContent('profile'); // Refresh profile to show new theme
    });
  }
}

async function addTodo() {
  document.getElementById('addTodoModal').style.display = 'flex';
  
  // Set up modal event listeners each time the modal opens
  setupModalEventListeners();
}

function setupModalEventListeners() {
  // Modal save button
  const saveTodoBtn = document.getElementById('saveTodoBtn');
  if (saveTodoBtn) {
    saveTodoBtn.replaceWith(saveTodoBtn.cloneNode(true)); // Remove old listeners
    document.getElementById('saveTodoBtn').addEventListener('click', saveTodo);
  }
  
  // Modal cancel button  
  const cancelTodoBtn = document.getElementById('cancelTodoBtn');
  if (cancelTodoBtn) {
    cancelTodoBtn.replaceWith(cancelTodoBtn.cloneNode(true)); // Remove old listeners
    document.getElementById('cancelTodoBtn').addEventListener('click', () => {
      document.getElementById('addTodoModal').style.display = 'none';
    });
  }
  
  // Modal category buttons
  document.querySelectorAll('.modal-category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent modal from closing
      document.querySelectorAll('.modal-category-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.background = isDarkMode ? '#404040' : '#f1f5f9';
        b.style.color = isDarkMode ? '#ffffff' : '#1a202c';
      });
      
      e.target.classList.add('selected');
      const colors = {
        personal: '#4caf50',
        work: '#2196f3',
        urgent: '#ff5722'
      };
      e.target.style.background = colors[e.target.dataset.category] || '#667eea';
      e.target.style.color = 'white';
    });
  });
  
  // Modal priority buttons
  document.querySelectorAll('.modal-priority-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent modal from closing
      document.querySelectorAll('.modal-priority-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.background = isDarkMode ? '#404040' : '#f1f5f9';
        b.style.color = isDarkMode ? '#ffffff' : '#1a202c';
      });
      
      e.target.classList.add('selected');
      const colors = {
        low: '#4caf50',
        medium: '#ff9800', 
        high: '#f44336'
      };
      e.target.style.background = colors[e.target.dataset.priority] || '#667eea';
      e.target.style.color = 'white';
    });
  });
}

async function saveTodo() {
  const textInput = document.getElementById('todoTextInput');
  const dueDateInput = document.getElementById('todoDueDateInput');
  const text = textInput.value.trim();
  const dueDate = dueDateInput.value;
  
  // Get selected category and priority
  const selectedCategoryBtn = document.querySelector('.modal-category-btn.selected');
  const selectedPriorityBtn = document.querySelector('.modal-priority-btn.selected');
  
  const category = selectedCategoryBtn ? selectedCategoryBtn.dataset.category : 'personal';
  const priority = selectedPriorityBtn ? selectedPriorityBtn.dataset.priority : 'medium';
  
  if (text && currentUser) {
    try {
      const todoData = {
        text: text,
        completed: false,
        userId: currentUser.uid,
        category: category,
        priority: priority,
        createdAt: serverTimestamp()
      };
      
      if (dueDate) {
        todoData.dueDate = new Date(dueDate);
      }
      
      await addDoc(collection(db, 'todos'), todoData);
      
      // Reset form and close modal
      textInput.value = '';
      dueDateInput.value = '';
      document.querySelectorAll('.modal-category-btn, .modal-priority-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.style.background = isDarkMode ? '#404040' : '#f1f5f9';
        btn.style.color = isDarkMode ? '#ffffff' : '#1a202c';
      });
      
      document.getElementById('addTodoModal').style.display = 'none';
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  }
}

function setupTodoEventListeners() {
  // Add todo button
  const addTodoBtn = document.getElementById('addTodoBtn');
  if (addTodoBtn) {
    addTodoBtn.addEventListener('click', addTodo);
  }
  
  // Manage tags button
  const manageTagsBtn = document.getElementById('manageTagsBtn');
  if (manageTagsBtn) {
    manageTagsBtn.addEventListener('click', openTagModal);
  }
  
  // Category filters
  document.querySelectorAll('.category-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterCategory = e.target.dataset.category;
      loadTabContent('todos'); // Refresh to update active state
    });
  });
  
  // Close modal when clicking outside
  const modal = document.getElementById('addTodoModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'addTodoModal') {
        document.getElementById('addTodoModal').style.display = 'none';
      }
    });
  }
  
  // Close tag modal when clicking outside
  const tagModal = document.getElementById('tagManagementModal');
  if (tagModal) {
    tagModal.addEventListener('click', (e) => {
      if (e.target.id === 'tagManagementModal') {
        document.getElementById('tagManagementModal').style.display = 'none';
      }
    });
  }
}

function openTagModal() {
  document.getElementById('tagManagementModal').style.display = 'flex';
  renderExistingTags();
  setupTagModalListeners();
}

function renderExistingTags() {
  const existingTagsList = document.getElementById('existingTagsList');
  if (!existingTagsList) return;
  
  const defaultTags = [
    { name: 'personal', color: '#4caf50' },
    { name: 'work', color: '#2196f3' },
    { name: 'urgent', color: '#ff5722' }
  ];
  
  const disabledTags = getDisabledTags();
  
  let tagsHTML = '';
  
  // Add default tags section
  if (defaultTags.length > 0) {
    tagsHTML += `
      <div style="
        font-size: 14px;
        font-weight: 600;
        color: ${isDarkMode ? '#b3b3b3' : '#666'};
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      ">Default Tags</div>
    `;
    
    defaultTags.forEach(tag => {
      const isDisabled = disabledTags.includes(tag.name);
      tagsHTML += `
        <div style="
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: ${isDisabled ? (isDarkMode ? '#2c2c2c' : '#f0f0f0') : (isDarkMode ? '#404040' : '#f8f8f8')};
          border-radius: 8px;
          margin-bottom: 8px;
          opacity: ${isDisabled ? '0.5' : '1'};
        ">
          <div style="
            width: 16px;
            height: 16px;
            background-color: ${tag.color};
            border-radius: 8px;
            margin-right: 12px;
          "></div>
          <span style="
            flex: 1;
            font-size: 16px;
            color: ${isDarkMode ? '#ffffff' : '#333'};
            text-decoration: ${isDisabled ? 'line-through' : 'none'};
          ">${tag.name}</span>
          <button onclick="${isDisabled ? `restoreDefaultTag('${tag.name}')` : `disableDefaultTag('${tag.name}'); renderExistingTags(); refreshCurrentView();`}" style="
            width: 24px;
            height: 24px;
            border: none;
            background: none;
            color: ${isDisabled ? '#4caf50' : '#f44336'};
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
          ">${isDisabled ? '↻' : '×'}</button>
        </div>
      `;
    });
  }
  
  // Add custom tags section
  if (tags.length > 0) {
    tagsHTML += `
      <div style="
        font-size: 14px;
        font-weight: 600;
        color: ${isDarkMode ? '#b3b3b3' : '#666'};
        margin: 20px 0 12px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      ">Custom Tags</div>
    `;
    
    tags.forEach(tag => {
      tagsHTML += `
        <div style="
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: ${isDarkMode ? '#404040' : '#f8f8f8'};
          border-radius: 8px;
          margin-bottom: 8px;
        ">
          <div style="
            width: 16px;
            height: 16px;
            background-color: ${tag.color};
            border-radius: 8px;
            margin-right: 12px;
          "></div>
          <span style="
            flex: 1;
            font-size: 16px;
            color: ${isDarkMode ? '#ffffff' : '#333'};
          ">${tag.name}</span>
          <button onclick="deleteTag('${tag.id}')" style="
            width: 24px;
            height: 24px;
            border: none;
            background: none;
            color: #f44336;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
          ">×</button>
        </div>
      `;
    });
  }
  
  if (tagsHTML === '') {
    existingTagsList.innerHTML = `
      <div style="
        text-align: center;
        color: #999;
        font-style: italic;
        padding: 20px;
        font-size: 14px;
      ">No tags available</div>
    `;
  } else {
    existingTagsList.innerHTML = tagsHTML;
  }
}

function setupTagModalListeners() {
  let selectedColor = '#667eea';
  
  // Color selection
  document.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Remove previous selection
      document.querySelectorAll('.color-option').forEach(b => {
        b.style.border = '2px solid transparent';
      });
      
      // Select new color
      e.target.style.border = '2px solid #333';
      selectedColor = e.target.dataset.color;
    });
  });
  
  // Close modal button
  const closeBtn = document.getElementById('closeTagModalBtn');
  if (closeBtn) {
    closeBtn.replaceWith(closeBtn.cloneNode(true));
    document.getElementById('closeTagModalBtn').addEventListener('click', () => {
      document.getElementById('tagManagementModal').style.display = 'none';
    });
  }
  
  // Add new tag button
  const addTagBtn = document.getElementById('addNewTagBtn');
  if (addTagBtn) {
    addTagBtn.replaceWith(addTagBtn.cloneNode(true));
    document.getElementById('addNewTagBtn').addEventListener('click', async () => {
      const nameInput = document.getElementById('newTagNameInput');
      const tagName = nameInput.value.trim();
      
      if (tagName && currentUser) {
        try {
          await addDoc(collection(db, 'tags'), {
            name: tagName,
            color: selectedColor,
            userId: currentUser.uid,
            createdAt: serverTimestamp()
          });
          
          nameInput.value = '';
          renderExistingTags();
        } catch (error) {
          console.error('Error adding tag:', error);
        }
      }
    });
  }
}

window.deleteTag = async (tagId) => {
  if (confirm('Are you sure you want to delete this tag?')) {
    try {
      await deleteDoc(doc(db, 'tags', tagId));
      renderExistingTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  }
};

let editingTodoId = null;

function openEditTodoModal(todo) {
  editingTodoId = todo.id;
  
  // Populate form fields
  document.getElementById('editTodoTextInput').value = todo.text;
  document.getElementById('editTodoDueDateInput').value = todo.dueDate 
    ? new Date(todo.dueDate.seconds * 1000).toISOString().split('T')[0] 
    : '';
  
  // Populate category buttons
  const editCategoryButtons = document.getElementById('editCategoryButtons');
  const allCategories = getAllCategories().filter(cat => cat !== 'all');
  editCategoryButtons.innerHTML = allCategories.map(category => `
    <button class="edit-category-btn ${todo.category === category ? 'selected' : ''}" data-category="${category}" style="
      padding: 8px 16px;
      border: none;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: capitalize;
      background: ${todo.category === category ? getCategoryColorForEdit(category) : (isDarkMode ? '#404040' : '#f1f5f9')};
      color: ${todo.category === category ? 'white' : (isDarkMode ? '#ffffff' : '#333')};
    ">${category}</button>
  `).join('');
  
  // Set priority buttons
  document.querySelectorAll('.edit-priority-btn').forEach(btn => {
    if (btn.dataset.priority === todo.priority) {
      btn.classList.add('selected');
      const colors = { low: '#4caf50', medium: '#ff9800', high: '#f44336' };
      btn.style.background = colors[todo.priority] || '#ff9800';
      btn.style.color = 'white';
    } else {
      btn.classList.remove('selected');
      btn.style.background = isDarkMode ? '#404040' : '#f1f5f9';
      btn.style.color = isDarkMode ? '#ffffff' : '#333';
    }
  });
  
  document.getElementById('editTodoModal').style.display = 'flex';
  setupEditModalListeners();
}

function getCategoryColorForEdit(category) {
  const defaultColors = {
    personal: '#4caf50',
    work: '#2196f3', 
    urgent: '#ff5722'
  };
  
  // Check if it's a default category
  if (defaultColors[category]) {
    return defaultColors[category];
  }
  
  // Look for custom tag
  const customTag = tags.find(tag => tag.name === category);
  if (customTag) {
    return customTag.color;
  }
  
  // Default color for unknown categories
  return '#667eea';
}

function setupEditModalListeners() {
  // Category button listeners
  document.querySelectorAll('.edit-category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.edit-category-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.background = isDarkMode ? '#404040' : '#f1f5f9';
        b.style.color = isDarkMode ? '#ffffff' : '#333';
      });
      
      e.target.classList.add('selected');
      e.target.style.background = getCategoryColorForEdit(e.target.dataset.category);
      e.target.style.color = 'white';
    });
  });
  
  // Priority button listeners
  document.querySelectorAll('.edit-priority-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Only clear other priority buttons, not category buttons
      document.querySelectorAll('.edit-priority-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.background = isDarkMode ? '#404040' : '#f1f5f9';
        b.style.color = isDarkMode ? '#ffffff' : '#333';
      });
      
      e.target.classList.add('selected');
      const colors = { low: '#4caf50', medium: '#ff9800', high: '#f44336' };
      e.target.style.background = colors[e.target.dataset.priority] || '#ff9800';
      e.target.style.color = 'white';
    });
  });
  
  // Save button
  const saveBtn = document.getElementById('saveEditTodoBtn');
  if (saveBtn) {
    saveBtn.replaceWith(saveBtn.cloneNode(true));
    document.getElementById('saveEditTodoBtn').addEventListener('click', saveEditedTodo);
  }
  
  // Cancel button
  const cancelBtn = document.getElementById('cancelEditTodoBtn');
  if (cancelBtn) {
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    document.getElementById('cancelEditTodoBtn').addEventListener('click', () => {
      document.getElementById('editTodoModal').style.display = 'none';
    });
  }
}

async function saveEditedTodo() {
  if (!editingTodoId) return;
  
  const text = document.getElementById('editTodoTextInput').value.trim();
  const dueDate = document.getElementById('editTodoDueDateInput').value;
  
  const selectedCategoryBtn = document.querySelector('.edit-category-btn.selected');
  const selectedPriorityBtn = document.querySelector('.edit-priority-btn.selected');
  
  const category = selectedCategoryBtn ? selectedCategoryBtn.dataset.category : 'personal';
  const priority = selectedPriorityBtn ? selectedPriorityBtn.dataset.priority : 'medium';
  
  if (!text) {
    alert('Please enter todo text');
    return;
  }
  
  try {
    const updates = {
      text: text,
      category: category,
      priority: priority,
      updatedAt: serverTimestamp()
    };
    
    if (dueDate) {
      updates.dueDate = new Date(dueDate);
    } else {
      updates.dueDate = null;
    }
    
    await updateDoc(doc(db, 'todos', editingTodoId), updates);
    document.getElementById('editTodoModal').style.display = 'none';
    editingTodoId = null;
  } catch (error) {
    console.error('Error updating todo:', error);
    alert('Failed to update todo');
  }
}

window.editTodo = (todoId) => {
  const todo = todos.find(t => t.id === todoId);
  if (todo) {
    openEditTodoModal(todo);
  }
};

// Event edit functionality
let editingEventId = null;

function openEditEventModal(event) {
  editingEventId = event.id;
  
  // Populate form fields
  document.getElementById('editEventNameInput').value = event.name || '';
  document.getElementById('editEventDescriptionInput').value = event.description || '';
  document.getElementById('editEventLocationInput').value = event.location || '';
  
  // Parse datetime for date and time inputs
  if (event.datetime) {
    // Handle both Timestamp objects and regular dates
    const eventDate = event.datetime.seconds 
      ? new Date(event.datetime.seconds * 1000)
      : new Date(event.datetime);
    
    document.getElementById('editEventDateInput').value = eventDate.toISOString().split('T')[0];
    document.getElementById('editEventTimeInput').value = eventDate.toTimeString().split(' ')[0].substring(0, 5);
  } else {
    document.getElementById('editEventDateInput').value = '';
    document.getElementById('editEventTimeInput').value = '';
  }
  
  document.getElementById('editEventModal').style.display = 'flex';
  setupEditEventModalListeners();
}

function setupEditEventModalListeners() {
  // Remove existing listeners to prevent duplicates
  const modal = document.getElementById('editEventModal');
  const newModal = modal.cloneNode(true);
  modal.parentNode.replaceChild(newModal, modal);
  
  // Add close modal listeners
  newModal.addEventListener('click', (e) => {
    if (e.target === newModal) {
      newModal.style.display = 'none';
      editingEventId = null;
    }
  });
  
  // Cancel button listener
  const cancelBtn = newModal.querySelector('#cancelEditEventBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      newModal.style.display = 'none';
      editingEventId = null;
    });
  }
  
  // Save button listener
  const saveBtn = newModal.querySelector('#saveEditEventBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveEditedEvent);
  }
}

async function saveEditedEvent() {
  if (!editingEventId) return;
  
  const name = document.getElementById('editEventNameInput').value.trim();
  const description = document.getElementById('editEventDescriptionInput').value.trim();
  const location = document.getElementById('editEventLocationInput').value.trim();
  const date = document.getElementById('editEventDateInput').value;
  const time = document.getElementById('editEventTimeInput').value;
  
  if (!name) {
    alert('Please enter event name');
    return;
  }
  
  if (!date || !time) {
    alert('Please select date and time');
    return;
  }
  
  try {
    const datetime = new Date(`${date}T${time}`);
    
    await updateDoc(doc(db, 'events', editingEventId), {
      name,
      description,
      location,
      datetime: Timestamp.fromDate(datetime),
      updatedAt: Timestamp.now()
    });
    
    document.getElementById('editEventModal').style.display = 'none';
    editingEventId = null;
  } catch (error) {
    console.error('Error updating event:', error);
    alert('Failed to update event');
  }
}

window.editEvent = (eventId) => {
  const event = events.find(e => e.id === eventId);
  if (event) {
    openEditEventModal(event);
  }
};

window.closeEditEventModal = () => {
  document.getElementById('editEventModal').style.display = 'none';
  editingEventId = null;
};

window.saveEditedEvent = saveEditedEvent;

// Drag and drop functionality
let draggedTodoId = null;

window.handleTodoDragStart = (event) => {
  draggedTodoId = event.target.getAttribute('data-todo-id');
  event.target.style.opacity = '0.5';
  event.dataTransfer.effectAllowed = 'move';
};

window.handleTodoDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  const draggedElement = event.currentTarget;
  const targetId = draggedElement.getAttribute('data-todo-id');
  
  if (targetId !== draggedTodoId) {
    // Clear previous indicators
    document.querySelectorAll('[data-todo-id]').forEach(item => {
      item.style.borderTop = '';
      item.style.borderBottom = '';
      item.style.backgroundColor = '';
      item.style.transform = '';
    });
    
    // Get mouse position within the element
    const rect = draggedElement.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    const elementHeight = rect.height;
    const isUpperHalf = mouseY < elementHeight / 2;
    
    // Show insertion line and lift effect
    if (isUpperHalf) {
      draggedElement.style.borderTop = '3px solid #667eea';
      draggedElement.style.boxShadow = '0 -2px 8px rgba(102, 126, 234, 0.3)';
    } else {
      draggedElement.style.borderBottom = '3px solid #667eea';
      draggedElement.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
    }
    
    // Highlight the drop zone
    draggedElement.style.backgroundColor = isDarkMode ? 'rgba(102, 126, 234, 0.1)' : 'rgba(102, 126, 234, 0.05)';
    draggedElement.style.transform = 'scale(1.02)';
    draggedElement.style.transition = 'all 0.2s ease';
  }
};

window.handleTodoDragLeave = (event) => {
  const draggedElement = event.currentTarget;
  // Only clear if we're actually leaving the element (not entering a child)
  if (!draggedElement.contains(event.relatedTarget)) {
    draggedElement.style.borderTop = '';
    draggedElement.style.borderBottom = '';
    draggedElement.style.backgroundColor = '';
    draggedElement.style.transform = '';
    draggedElement.style.boxShadow = '';
  }
};

window.handleTodoDrop = async (event) => {
  event.preventDefault();
  
  const targetTodoId = event.currentTarget.getAttribute('data-todo-id');
  const draggedElement = event.currentTarget;
  
  // Remove visual feedback
  draggedElement.style.borderTop = '';
  draggedElement.style.borderBottom = '';
  draggedElement.style.backgroundColor = '';
  draggedElement.style.transform = '';
  draggedElement.style.boxShadow = '';
  
  if (targetTodoId && draggedTodoId && targetTodoId !== draggedTodoId) {
    await reorderTodos(draggedTodoId, targetTodoId);
  }
};

window.handleTodoDragEnd = (event) => {
  event.target.style.opacity = '1';
  
  // Remove visual feedback from all items
  document.querySelectorAll('[data-todo-id]').forEach(item => {
    item.style.borderTop = '';
    item.style.borderBottom = '';
    item.style.backgroundColor = '';
    item.style.transform = '';
    item.style.boxShadow = '';
    item.style.transition = '';
  });
  
  draggedTodoId = null;
};

async function reorderTodos(draggedId, targetId) {
  try {
    // Find the todos in the current filtered list
    const currentTodos = getFilteredTodos();
    const draggedIndex = currentTodos.findIndex(t => t.id === draggedId);
    const targetIndex = currentTodos.findIndex(t => t.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Calculate proper order value based on drop position
    let newOrder;
    
    if (draggedIndex < targetIndex) {
      // Moving down: place after target
      const nextIndex = targetIndex + 1;
      if (nextIndex < currentTodos.length) {
        // Insert between target and next item
        const targetOrder = currentTodos[targetIndex].order || 0;
        const nextOrder = currentTodos[nextIndex].order || 0;
        newOrder = (targetOrder + nextOrder) / 2;
      } else {
        // Insert at the end
        newOrder = (currentTodos[targetIndex].order || 0) + 1000;
      }
    } else {
      // Moving up: place before target
      const prevIndex = targetIndex - 1;
      if (prevIndex >= 0) {
        // Insert between previous and target item
        const prevOrder = currentTodos[prevIndex].order || 0;
        const targetOrder = currentTodos[targetIndex].order || 0;
        newOrder = (prevOrder + targetOrder) / 2;
      } else {
        // Insert at the beginning
        newOrder = (currentTodos[targetIndex].order || 0) - 1000;
      }
    }
    
    // Update Firebase
    await updateDoc(doc(db, 'todos', draggedId), {
      order: newOrder,
      updatedAt: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error reordering todos:', error);
  }
}

function getFilteredTodos() {
  let filteredTodos = todos;
  if (filterCategory !== 'all') {
    filteredTodos = todos.filter(todo => todo.category === filterCategory);
  }
  
  // Sort by completion status first (completed at bottom), then by order, priority and due date
  return filteredTodos.sort((a, b) => {
    // Primary sort by completion status (incomplete tasks first)
    if (a.completed !== b.completed) {
      return a.completed - b.completed; // false (0) comes before true (1)
    }
    
    // Secondary sort by order (for drag and drop positioning)
    const aOrder = a.order || 0;
    const bOrder = b.order || 0;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    // Tertiary sort by priority (only for incomplete tasks)
    if (!a.completed && !b.completed) {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
    }
    
    // Quaternary sort by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate.seconds * 1000) - new Date(b.dueDate.seconds * 1000);
    }
    
    return 0;
  });
}

// Grocery drag and drop functionality
let draggedGroceryId = null;

window.handleGroceryDragStart = (event) => {
  draggedGroceryId = event.target.getAttribute('data-grocery-id');
  event.target.style.opacity = '0.5';
  event.dataTransfer.effectAllowed = 'move';
};

window.handleGroceryDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  const draggedElement = event.currentTarget;
  const targetId = draggedElement.getAttribute('data-grocery-id');
  
  if (targetId !== draggedGroceryId) {
    // Clear previous indicators
    document.querySelectorAll('[data-grocery-id]').forEach(item => {
      item.style.borderTop = '';
      item.style.borderBottom = '';
      item.style.backgroundColor = '';
      item.style.transform = '';
    });
    
    // Get mouse position within the element
    const rect = draggedElement.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    const elementHeight = rect.height;
    const isUpperHalf = mouseY < elementHeight / 2;
    
    // Show insertion line and lift effect
    if (isUpperHalf) {
      draggedElement.style.borderTop = '3px solid #10b981';
      draggedElement.style.boxShadow = '0 -2px 8px rgba(16, 185, 129, 0.3)';
    } else {
      draggedElement.style.borderBottom = '3px solid #10b981';
      draggedElement.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
    }
    
    // Highlight the drop zone
    draggedElement.style.backgroundColor = isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)';
    draggedElement.style.transform = 'scale(1.02)';
    draggedElement.style.transition = 'all 0.2s ease';
  }
};

window.handleGroceryDragLeave = (event) => {
  const draggedElement = event.currentTarget;
  // Only clear if we're actually leaving the element (not entering a child)
  if (!draggedElement.contains(event.relatedTarget)) {
    draggedElement.style.borderTop = '';
    draggedElement.style.borderBottom = '';
    draggedElement.style.backgroundColor = '';
    draggedElement.style.transform = '';
    draggedElement.style.boxShadow = '';
  }
};

window.handleGroceryDrop = async (event) => {
  event.preventDefault();
  
  const targetGroceryId = event.currentTarget.getAttribute('data-grocery-id');
  const draggedElement = event.currentTarget;
  
  // Remove visual feedback
  draggedElement.style.borderTop = '';
  draggedElement.style.borderBottom = '';
  draggedElement.style.backgroundColor = '';
  draggedElement.style.transform = '';
  draggedElement.style.boxShadow = '';
  
  if (targetGroceryId && draggedGroceryId && targetGroceryId !== draggedGroceryId) {
    await reorderGroceries(draggedGroceryId, targetGroceryId);
  }
};

window.handleGroceryDragEnd = (event) => {
  event.target.style.opacity = '1';
  
  // Remove visual feedback from all items
  document.querySelectorAll('[data-grocery-id]').forEach(item => {
    item.style.borderTop = '';
    item.style.borderBottom = '';
    item.style.backgroundColor = '';
    item.style.transform = '';
    item.style.boxShadow = '';
    item.style.transition = '';
  });
  
  draggedGroceryId = null;
};

async function reorderGroceries(draggedId, targetId) {
  try {
    const draggedIndex = groceries.findIndex(g => g.id === draggedId);
    const targetIndex = groceries.findIndex(g => g.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Calculate proper order value based on drop position
    let newOrder;
    
    if (draggedIndex < targetIndex) {
      // Moving down: place after target
      const nextIndex = targetIndex + 1;
      if (nextIndex < groceries.length) {
        // Insert between target and next item
        const targetOrder = groceries[targetIndex].order || 0;
        const nextOrder = groceries[nextIndex].order || 0;
        newOrder = (targetOrder + nextOrder) / 2;
      } else {
        // Insert at the end
        newOrder = (groceries[targetIndex].order || 0) + 1000;
      }
    } else {
      // Moving up: place before target
      const prevIndex = targetIndex - 1;
      if (prevIndex >= 0) {
        // Insert between previous and target item
        const prevOrder = groceries[prevIndex].order || 0;
        const targetOrder = groceries[targetIndex].order || 0;
        newOrder = (prevOrder + targetOrder) / 2;
      } else {
        // Insert at the beginning
        newOrder = (groceries[targetIndex].order || 0) - 1000;
      }
    }
    
    await updateDoc(doc(db, 'groceries', draggedId), {
      order: newOrder,
      updatedAt: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error reordering groceries:', error);
  }
}

async function addGrocery() {
  const textInput = document.getElementById('groceryInput');
  const quantityInput = document.getElementById('quantityInput');
  const text = textInput.value.trim();
  const quantity = quantityInput.value || '1';
  
  if (text && currentUser) {
    try {
      await addDoc(collection(db, 'groceries'), {
        text: text,
        quantity: quantity,
        completed: false,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      textInput.value = '';
      quantityInput.value = '1';
    } catch (error) {
      console.error('Error adding grocery:', error);
    }
  }
}

async function addEvent() {
  const nameInput = document.getElementById('eventNameInput');
  const descriptionInput = document.getElementById('eventDescriptionInput');
  const locationInput = document.getElementById('eventLocationInput');
  const dateInput = document.getElementById('eventDateInput');
  const timeInput = document.getElementById('eventTimeInput');
  
  const name = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  const location = locationInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;
  
  if (name && date && currentUser) {
    try {
      const eventDateTime = new Date(`${date}T${time || '00:00'}`);
      
      await addDoc(collection(db, 'events'), {
        name: name,
        description: description || '',
        location: location || '',
        datetime: eventDateTime,
        userId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      // Clear inputs
      nameInput.value = '';
      descriptionInput.value = '';
      locationInput.value = '';
      dateInput.value = '';
      timeInput.value = '';
    } catch (error) {
      console.error('Error adding event:', error);
    }
  }
}

function renderTodos() {
  const todosList = document.getElementById('todosList');
  if (!todosList) {
    return;
  }
  
  // Get filtered and sorted todos
  const filteredTodos = getFilteredTodos();
  
  const bgColor = isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'white';
  const textColor = isDarkMode ? '#ffffff' : '#333333';
  const secondaryTextColor = isDarkMode ? '#b3b3b3' : '#666666';
  
  todosList.innerHTML = filteredTodos.map(todo => {
    const getCategoryColor = (category) => {
      const defaultColors = {
        personal: '#4caf50',
        work: '#2196f3', 
        urgent: '#ff5722'
      };
      
      // Check if it's a default category
      if (defaultColors[category]) {
        return defaultColors[category];
      }
      
      // Check if it's a custom tag
      const customTag = tags.find(tag => tag.name === category);
      if (customTag) {
        return customTag.color;
      }
      
      return '#667eea';
    };
    
    const priorityColors = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336'
    };
    
    const categoryColor = getCategoryColor(todo.category);
    const priorityColor = priorityColors[todo.priority] || '#ff9800';
    
    const formatDate = (date) => {
      if (!date) return null;
      const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
      return d.toLocaleDateString();
    };
    
    return `
      <div 
        draggable="true"
        data-todo-id="${todo.id}"
        style="
          display: flex;
          align-items: flex-start;
          background: ${bgColor};
          backdrop-filter: blur(20px);
          padding: 20px;
          border-radius: 16px;
          border: 1px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
          box-shadow: 0 4px 16px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
          transition: all 0.2s ease;
          margin-bottom: 12px;
          cursor: move;
        " 
        onmouseover="this.style.transform='translateY(-2px)'" 
        onmouseout="this.style.transform='translateY(0)'"
        ondragstart="handleTodoDragStart(event)"
        ondragover="handleTodoDragOver(event)"
        ondragleave="handleTodoDragLeave(event)"
        ondrop="handleTodoDrop(event)"
        ondragend="handleTodoDragEnd(event)">
        
        <button onclick="toggleTodo('${todo.id}')" style="
          width: 28px;
          height: 28px;
          border-radius: 14px;
          border: 2px solid ${categoryColor};
          background-color: ${todo.completed ? categoryColor : 'transparent'};
          color: white;
          margin-right: 16px;
          margin-top: 2px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
        ">${todo.completed ? '✓' : ''}</button>
        
        <div style="flex: 1; min-width: 0;">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          ">
            <div style="
              font-size: 16px;
              font-weight: 500;
              color: ${textColor};
              text-decoration: ${todo.completed ? 'line-through' : 'none'};
              opacity: ${todo.completed ? '0.6' : '1'};
              line-height: 1.4;
              word-wrap: break-word;
              flex: 1;
              margin-right: 12px;
            ">${todo.text}</div>
            
            <div style="
              background: ${priorityColor};
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              white-space: nowrap;
            ">${todo.priority || 'medium'}</div>
          </div>
          
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
          ">
            <div style="
              background: ${categoryColor};
              color: white;
              padding: 4px 12px;
              border-radius: 16px;
              font-size: 12px;
              font-weight: 600;
              text-transform: capitalize;
            ">${todo.category || 'personal'}</div>
            
            ${todo.dueDate ? `
              <div style="
                font-size: 12px;
                color: ${secondaryTextColor};
                font-style: italic;
              ">Due: ${formatDate(todo.dueDate)}</div>
            ` : ''}
          </div>
        </div>
        
        <div style="display: flex; gap: 4px; margin-left: 8px;">
          <button onclick="editTodo('${todo.id}')" style="
            width: 32px;
            height: 32px;
            border: none;
            background: none;
            color: ${isDarkMode ? '#64b5f6' : '#2196f3'};
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          " onmouseover="this.style.background='${isDarkMode ? 'rgba(100, 181, 246, 0.1)' : 'rgba(33, 150, 243, 0.1)'}'" onmouseout="this.style.background='none'">✏️</button>
          <button onclick="deleteTodo('${todo.id}')" style="
            width: 32px;
            height: 32px;
            border: none;
            background: none;
            color: ${isDarkMode ? '#ff6b6b' : '#FF3B30'};
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          " onmouseover="this.style.background='${isDarkMode ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 59, 48, 0.1)'}'" onmouseout="this.style.background='none'">×</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderGroceries() {
  const groceriesList = document.getElementById('groceriesList');
  if (!groceriesList) return;
  
  // Sort groceries by completion status first (completed at bottom), then by order
  const sortedGroceries = groceries.sort((a, b) => {
    // Primary sort by completion status (incomplete items first)
    if (a.completed !== b.completed) {
      return a.completed - b.completed; // false (0) comes before true (1)
    }
    
    // Secondary sort by order (for drag and drop positioning)
    const aOrder = a.order || 0;
    const bOrder = b.order || 0;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    return 0;
  });

  groceriesList.innerHTML = sortedGroceries.map(grocery => `
    <div 
      draggable="true"
      data-grocery-id="${grocery.id}"
      style="
        display: flex;
        align-items: center;
        background-color: ${isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'white'};
        padding: 15px;
        margin-bottom: 10px;
        border-radius: 12px;
        border: 1px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
        box-shadow: 0 4px 16px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
        cursor: move;
        transition: all 0.2s ease;
      "
      onmouseover="this.style.transform='translateY(-2px)'" 
      onmouseout="this.style.transform='translateY(0)'"
      ondragstart="handleGroceryDragStart(event)"
      ondragover="handleGroceryDragOver(event)"
      ondragleave="handleGroceryDragLeave(event)"
      ondrop="handleGroceryDrop(event)"
      ondragend="handleGroceryDragEnd(event)">
      <button onclick="toggleGrocery('${grocery.id}')" style="
        width: 24px;
        height: 24px;
        border-radius: 12px;
        border: 2px solid #34C759;
        background-color: ${grocery.completed ? '#34C759' : 'white'};
        color: white;
        margin-right: 15px;
        cursor: pointer;
      ">${grocery.completed ? '✓' : ''}</button>
      
      <div style="flex: 1;">
        <div style="
          font-size: 16px;
          color: ${grocery.completed ? '#999' : (isDarkMode ? '#ffffff' : '#333')};
          text-decoration: ${grocery.completed ? 'line-through' : 'none'};
          margin-bottom: 2px;
        ">${grocery.text}</div>
        <div style="
          font-size: 12px;
          color: ${grocery.completed ? '#999' : (isDarkMode ? '#b3b3b3' : '#666')};
        ">Qty: ${grocery.quantity}</div>
      </div>
      
      <button onclick="deleteGrocery('${grocery.id}')" style="
        width: 30px;
        height: 30px;
        border: none;
        background: none;
        color: #FF3B30;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
      ">×</button>
    </div>
  `).join('');
}

function renderEvents() {
  const eventsList = document.getElementById('eventsList');
  if (!eventsList) return;
  
  // Sort events by datetime
  const sortedEvents = [...events].sort((a, b) => {
    const aDate = a.datetime && a.datetime.seconds ? new Date(a.datetime.seconds * 1000) : new Date(a.datetime);
    const bDate = b.datetime && b.datetime.seconds ? new Date(b.datetime.seconds * 1000) : new Date(b.datetime);
    return aDate - bDate;
  });
  
  eventsList.innerHTML = sortedEvents.map(event => {
    // Handle both Timestamp objects and regular dates
    const eventDate = event.datetime && event.datetime.seconds 
      ? new Date(event.datetime.seconds * 1000) 
      : new Date(event.datetime);
    
    const isUpcoming = eventDate > new Date();
    const dateStr = eventDate.toLocaleDateString();
    const timeStr = eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const bgColor = isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'white';
    const textColor = isDarkMode ? '#ffffff' : '#333333';
    const secondaryTextColor = isDarkMode ? '#b3b3b3' : '#666666';
    
    return `
      <div style="
        background-color: ${bgColor};
        padding: 20px;
        margin-bottom: 15px;
        border-radius: 12px;
        border: 1px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
        border-left: 4px solid ${isUpcoming ? '#FF9500' : '#ccc'};
        box-shadow: 0 4px 16px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
        transition: all 0.2s ease;
      " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <div style="display: flex; justify-content: between; align-items: flex-start;">
          <div style="flex: 1;">
            <h3 style="
              margin: 0 0 8px 0;
              color: ${isUpcoming ? textColor : secondaryTextColor};
              font-size: 18px;
            ">${event.name}</h3>
            
            ${event.description ? `
              <p style="
                margin: 0 0 12px 0;
                color: ${secondaryTextColor};
                line-height: 1.4;
              ">${event.description}</p>
            ` : ''}
            
            <div style="
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              margin-bottom: 8px;
            ">
              <div style="
                display: flex;
                align-items: center;
                color: ${secondaryTextColor};
                font-size: 14px;
              ">
                📅 ${dateStr} at ${timeStr}
              </div>
              
              ${event.location ? `
                <div style="
                  display: flex;
                  align-items: center;
                  color: ${secondaryTextColor};
                  font-size: 14px;
                ">
                  📍 ${event.location}
                </div>
              ` : ''}
            </div>
          </div>
          
          <div style="display: flex; gap: 4px; margin-left: 10px;">
            <button onclick="editEvent('${event.id}')" style="
              width: 32px;
              height: 32px;
              border: none;
              background: none;
              color: ${isDarkMode ? '#64b5f6' : '#2196f3'};
              font-size: 16px;
              cursor: pointer;
              border-radius: 8px;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              justify-content: center;
            " onmouseover="this.style.background='${isDarkMode ? 'rgba(100, 181, 246, 0.1)' : 'rgba(33, 150, 243, 0.1)'}'"
               onmouseout="this.style.background='none'">✏️</button>
            <button onclick="deleteEvent('${event.id}')" style="
              width: 32px;
              height: 32px;
              border: none;
              background: none;
              color: ${isDarkMode ? '#ff6b6b' : '#FF3B30'};
              font-size: 20px;
              cursor: pointer;
              border-radius: 8px;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              justify-content: center;
            " onmouseover="this.style.background='${isDarkMode ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 59, 48, 0.1)'}'"
               onmouseout="this.style.background='none'">×</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Global functions for onclick handlers
window.toggleTodo = async (id) => {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    try {
      await updateDoc(doc(db, 'todos', id), {
        completed: !todo.completed
      });
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  }
};

window.deleteTodo = async (id) => {
  if (confirm('Are you sure you want to delete this todo?')) {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  }
};

window.toggleGrocery = async (id) => {
  const grocery = groceries.find(g => g.id === id);
  if (grocery) {
    try {
      await updateDoc(doc(db, 'groceries', id), {
        completed: !grocery.completed
      });
    } catch (error) {
      console.error('Error updating grocery:', error);
    }
  }
};

window.deleteGrocery = async (id) => {
  if (confirm('Are you sure you want to delete this item?')) {
    try {
      await deleteDoc(doc(db, 'groceries', id));
    } catch (error) {
      console.error('Error deleting grocery:', error);
    }
  }
};

window.deleteEvent = async (id) => {
  if (confirm('Are you sure you want to delete this event?')) {
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }
};

// Initialize theme from localStorage
if (localStorage.getItem('isDarkMode')) {
  isDarkMode = JSON.parse(localStorage.getItem('isDarkMode'));
}

// Auth state listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  
  if (user) {
    console.log('User signed in:', user.email);
    showMainScreen();
    
    // Set up real-time listeners for todos
    const todosQuery = query(collection(db, 'todos'), where('userId', '==', user.uid));
    onSnapshot(todosQuery, (snapshot) => {
      todos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderTodos();
    });
    
    // Set up real-time listeners for groceries
    const groceriesQuery = query(collection(db, 'groceries'), where('userId', '==', user.uid));
    onSnapshot(groceriesQuery, (snapshot) => {
      groceries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderGroceries();
    });
    
    // Set up real-time listeners for events
    const eventsQuery = query(collection(db, 'events'), where('userId', '==', user.uid));
    onSnapshot(eventsQuery, (snapshot) => {
      events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      renderEvents();
    });
    
    // Set up real-time listeners for tags
    const tagsQuery = query(collection(db, 'tags'), where('userId', '==', user.uid));
    onSnapshot(tagsQuery, (snapshot) => {
      tags = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Refresh todos view if it's active to update category filters
      if (document.getElementById('todosList')) {
        loadTabContent('todos');
      }
    });
    
  } else {
    console.log('User signed out');
    showLoginScreen();
    // Clear data when signed out
    todos = [];
    groceries = [];
    events = [];
    tags = [];
  }
});

// Initialize the app
createApp();

