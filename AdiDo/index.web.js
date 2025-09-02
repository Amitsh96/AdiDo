// Import Firebase directly
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, getDocs, Timestamp, setDoc, getDoc } from 'firebase/firestore';

console.log('Loading AdiDo... (updated)');

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
let firstName = '';
let userProfiles = {}; // Store user profiles with emoji data
let todos = [];
let groceries = [];
let events = [];
let tags = [];
let groups = [];
let currentGroupId = 'personal';
let isDarkMode = false;
let filterCategory = 'all';
let showAddTodoModal = false;
let showTagModal = false;
let editingTodo = null; // Todo currently being edited

// Drag and drop variables
let draggedTodoId = null;
let draggedElement = null;
let draggedIndex = null;
let currentPreviewIndex = null;
let todoItems = [];
let draggedGroceryId = null;
let draggedGroceryElement = null;
let draggedGroceryIndex = null;
let currentGroceryPreviewIndex = null;
let groceryItems = [];

// Make drag variables available globally for inline event handlers
window.draggedTodoId = draggedTodoId;
window.draggedGroceryId = draggedGroceryId;

// Group management functions
function getCurrentGroup() {
  return groups.find(group => group.id === currentGroupId) || { 
    id: 'personal', 
    name: 'Personal', 
    emoji: '👤',
    type: 'personal',
    members: [{userId: currentUser?.uid, role: 'owner', name: currentUser?.email}]
  };
}

function switchToGroup(groupId) {
  currentGroupId = groupId;
  localStorage.setItem('currentGroupId', groupId);
  
  // Apply group-specific theme
  applyGroupTheme();
  
  // Refresh real-time listeners for new group
  setupRealtimeListeners();
  
  // Refresh current tab to show new group's data
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab) {
    loadTabContent(activeTab.dataset.tab);
  }
}

function getGroupDisplayName(group) {
  if (!group) return 'Personal';
  return `${group.emoji || '👥'} ${group.name}`;
}

// Group switching UI functions
function openGroupSwitcher() {
  renderGroupsList();
  document.getElementById('groupSwitcherModal').style.display = 'flex';
}

function closeGroupSwitcher() {
  document.getElementById('groupSwitcherModal').style.display = 'none';
}

// Group details functions
function openGroupDetails() {
  renderGroupDetails();
  document.getElementById('groupDetailsModal').style.display = 'flex';
}

function closeGroupDetails() {
  document.getElementById('groupDetailsModal').style.display = 'none';
}

// Load user profiles for group members
async function loadUserProfiles(groups) {
  const userIds = new Set();
  
  // Collect all unique user IDs from all groups
  groups.forEach(group => {
    if (group.members) {
      group.members.forEach(member => {
        userIds.add(member.userId);
      });
    }
  });
  
  // Load profiles for users we don't have cached
  for (const userId of userIds) {
    if (!userProfiles[userId]) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          userProfiles[userId] = userDoc.data();
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    }
  }
}

window.closeGroupDetails = closeGroupDetails;

function renderGroupsList() {
  const groupsList = document.getElementById('groupsList');
  if (!groupsList) return;
  
  // Always include personal space
  const allGroups = [
    { 
      id: 'personal', 
      name: 'Personal', 
      emoji: '👤',
      type: 'personal',
      members: [{userId: currentUser?.uid, role: 'owner', name: currentUser?.email}]
    },
    ...groups
  ];
  
  groupsList.innerHTML = allGroups.map(group => {
    const isActive = group.id === currentGroupId;
    const memberCount = group.members?.length || 0;
    const memberText = memberCount === 1 ? '1 member' : `${memberCount} members`;
    
    // Check if user can invite to this group (owner or admin)
    const userMember = group.members?.find(member => member.userId === currentUser?.uid);
    const canInvite = group.id !== 'personal' && userMember && (userMember.role === 'owner' || userMember.role === 'admin');
    
    // Get activity information
    const activity = getGroupActivity(group.id);
    
    // Generate member avatars (show up to 4, then +X more)
    const membersToShow = group.members?.slice(0, 4) || [];
    const remainingCount = Math.max(0, memberCount - 4);
    
    const memberAvatars = group.id === 'personal' ? '' : membersToShow.map(member => {
      const avatarText = getUserAvatar(member);
      const avatarColor = getAvatarColor(member.userId);
      const isCurrentUser = member.userId === currentUser?.uid;
      const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(avatarText);
      
      return `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${isEmoji ? 'transparent' : avatarColor + '20'};
          border: 2px solid ${isEmoji ? 'transparent' : avatarColor};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isEmoji ? '18px' : '12px'};
          font-weight: 600;
          color: ${isEmoji ? 'inherit' : avatarColor};
          margin-left: -6px;
          position: relative;
          z-index: ${isCurrentUser ? '10' : '1'};
          ${isCurrentUser && !isEmoji ? `box-shadow: 0 0 0 2px ${isActive ? 'rgba(255,255,255,0.5)' : avatarColor + '40'};` : ''}
          ${isCurrentUser && isEmoji ? `box-shadow: 0 0 0 3px ${isActive ? 'rgba(255,255,255,0.8)' : 'rgba(16, 185, 129, 0.6)'};` : ''}
        " title="${member.name || member.email}${isCurrentUser ? ' (You)' : ''}">${avatarText}</div>
      `;
    }).join('') + (remainingCount > 0 ? `
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${isDarkMode ? 'rgba(100, 116, 139, 0.2)' : 'rgba(148, 163, 184, 0.2)'};
        border: 2px solid ${isDarkMode ? '#64748b' : '#94a3b8'};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 600;
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        margin-left: -6px;
      ">+${remainingCount}</div>
    ` : '');
    
    return `
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: ${isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : (isDarkMode ? 'rgba(40, 40, 40, 0.5)' : 'rgba(248, 250, 252, 0.8)')};
        color: ${isActive ? 'white' : (isDarkMode ? '#e2e8f0' : '#1a202c')};
        border-radius: 12px;
        transition: all 0.2s;
        border: ${isActive ? '2px solid rgba(255,255,255,0.3)' : '1px solid ' + (isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.5)')};
        margin-bottom: 8px;
        position: relative;
        overflow: hidden;
      ">
        <div onclick="selectGroup('${group.id}')" style="
          display: flex;
          align-items: center;
          flex: 1;
          cursor: pointer;
        " onmouseover="if (!${isActive}) this.parentElement.style.background='${isDarkMode ? 'rgba(50, 50, 50, 0.7)' : 'rgba(240, 245, 251, 1)'}'"
           onmouseout="if (!${isActive}) this.parentElement.style.background='${isDarkMode ? 'rgba(40, 40, 40, 0.5)' : 'rgba(248, 250, 252, 0.8)'}'">
          <div style="
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: ${isActive ? 'rgba(255,255,255,0.15)' : (group.id === 'personal' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, #10b981 0%, #34d399 100)')};
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 20px;
            position: relative;
          ">
            ${group.emoji || '👥'}
            ${group.id !== 'personal' && activity?.hasRecentActivity ? `
              <div style="
                position: absolute;
                top: -2px;
                right: -2px;
                width: 12px;
                height: 12px;
                background: ${activity.hasVeryRecentActivity ? '#10b981' : '#f59e0b'};
                border-radius: 50%;
                border: 2px solid ${isActive ? 'rgba(255,255,255,0.9)' : 'white'};
                animation: ${activity.hasVeryRecentActivity ? 'pulse 2s infinite' : 'none'};
              " title="Recent activity: ${getRelativeTime(activity.lastActivityTime)}"></div>
              <style>
                @keyframes pulse {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.1); opacity: 0.7; }
                }
                
                .dragging {
                  opacity: 0.15 !important;
                  cursor: grabbing !important;
                }
                
                .todo-item:hover {
                  cursor: grab;
                }
                
                .grocery-item:hover {
                  cursor: grab;
                }
              </style>
            ` : ''}
          </div>
          <div style="flex: 1;">
            <div style="
              font-weight: 600; 
              font-size: 16px;
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              ${group.name}
              ${group.id !== 'personal' && userMember?.role === 'owner' ? '<span style="font-size: 12px;">👑</span>' : ''}
              ${group.id !== 'personal' && userMember?.role === 'admin' ? '<span style="font-size: 12px;">⭐</span>' : ''}
            </div>
            <div style="
              font-size: 12px; 
              opacity: 0.7;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              <span>${memberText}</span>
              ${activity?.hasRecentActivity ? `
                <span style="
                  font-size: 11px;
                  color: ${activity.hasVeryRecentActivity ? '#10b981' : '#f59e0b'};
                  font-weight: 500;
                ">• Active ${getRelativeTime(activity.lastActivityTime)}</span>
              ` : ''}
              ${group.id !== 'personal' && memberAvatars ? `
                <div style="
                  display: flex;
                  align-items: center;
                  margin-left: 4px;
                ">${memberAvatars}</div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 8px;">
          ${isActive ? '<span style="font-size: 16px; margin-left: 8px;">✓</span>' : ''}
        </div>
        
        ${isActive ? `
          <div style="
            position: absolute;
            left: 0;
            top: 0;
            width: 4px;
            height: 100%;
            background: rgba(255,255,255,0.6);
            border-radius: 2px 0 0 2px;
          "></div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function selectGroup(groupId) {
  if (groupId !== currentGroupId) {
    switchToGroup(groupId);
  }
  closeGroupSwitcher();
}

// Group creation functionality
function openCreateGroupModal() {
  closeGroupSwitcher();
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: ${isDarkMode ? '#1e293b' : '#ffffff'};
    border-radius: 20px;
    padding: 32px;
    width: 100%;
    max-width: 480px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
  `;
  
  modal.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    ">
      <h2 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      ">Create New Group</h2>
      <button id="closeCreateModal" style="
        width: 32px;
        height: 32px;
        border: none;
        background: ${isDarkMode ? '#334155' : '#f1f5f9'};
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        font-size: 18px;
        transition: all 0.2s;
      ">×</button>
    </div>
    
    <form id="createGroupForm">
      <div style="margin-bottom: 20px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#cbd5e1' : '#374151'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">Group Name *</label>
        <input type="text" id="groupName" required maxlength="50" style="
          width: 100%;
          height: 48px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 16px;
          background-color: ${isDarkMode ? '#334155' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s;
        " placeholder="Enter group name">
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#cbd5e1' : '#374151'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">Group Type *</label>
        <select id="groupType" required style="
          width: 100%;
          height: 48px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 16px;
          background-color: ${isDarkMode ? '#334155' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          outline: none;
          box-sizing: border-box;
          cursor: pointer;
        ">
          <option value="">Select group type</option>
          <option value="family">👨‍👩‍👧‍👦 Family Group</option>
          <option value="couple">👩‍❤️‍💋‍👨 Couple</option>
          <option value="friends">👥 Friends</option>
          <option value="household">🏠 Household</option>
          <option value="work">💼 Work Team</option>
          <option value="roommates">🏨 Roommates</option>
          <option value="travel">✈️ Travel Group</option>
          <option value="study">📚 Study Group</option>
        </select>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#cbd5e1' : '#374151'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">Group Icon</label>
        <div id="emojiSelector" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
          gap: 8px;
          padding: 16px;
          background-color: ${isDarkMode ? '#334155' : '#f8fafc'};
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          max-height: 120px;
          overflow-y: auto;
        ">
          <button type="button" class="emoji-btn selected" data-emoji="👨‍👩‍👧‍👦" style="
            width: 48px;
            height: 48px;
            border: 2px solid #667eea;
            background-color: rgba(102, 126, 234, 0.1);
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
          ">👨‍👩‍👧‍👦</button>
          <button type="button" class="emoji-btn" data-emoji="💑" style="
            width: 48px;
            height: 48px;
            border: 2px solid transparent;
            background-color: ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
          ">💑</button>
          <button type="button" class="emoji-btn" data-emoji="👥" style="
            width: 48px;
            height: 48px;
            border: 2px solid transparent;
            background-color: ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
          ">👥</button>
          <button type="button" class="emoji-btn" data-emoji="🏠" style="
            width: 48px;
            height: 48px;
            border: 2px solid transparent;
            background-color: ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
          ">🏠</button>
          <button type="button" class="emoji-btn" data-emoji="💼" style="
            width: 48px;
            height: 48px;
            border: 2px solid transparent;
            background-color: ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
          ">💼</button>
          <button type="button" class="emoji-btn" data-emoji="🎯" style="
            width: 48px;
            height: 48px;
            border: 2px solid transparent;
            background-color: ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
          ">🎯</button>
          <button type="button" class="emoji-btn" data-emoji="⭐" style="
            width: 48px;
            height: 48px;
            border: 2px solid transparent;
            background-color: ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
          ">⭐</button>
          <button type="button" class="emoji-btn" data-emoji="🌟" style="
            width: 48px;
            height: 48px;
            border: 2px solid transparent;
            background-color: ${isDarkMode ? '#475569' : '#e2e8f0'};
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
          ">🌟</button>
        </div>
        <input type="hidden" id="selectedEmoji" value="👨‍👩‍👧‍👦">
      </div>
      
      <div style="margin-bottom: 24px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#cbd5e1' : '#374151'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">Description (Optional)</label>
        <textarea id="groupDescription" maxlength="200" rows="3" style="
          width: 100%;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 12px 16px;
          background-color: ${isDarkMode ? '#334155' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          outline: none;
          box-sizing: border-box;
          resize: vertical;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.2s;
        " placeholder="Describe your group (optional)"></textarea>
      </div>
      
      <div style="
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      ">
        <button type="button" id="cancelCreateGroup" style="
          padding: 12px 24px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          background-color: transparent;
          color: ${isDarkMode ? '#cbd5e1' : '#64748b'};
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">Cancel</button>
        <button type="submit" id="createGroupSubmit" style="
          padding: 12px 24px;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 120px;
        ">Create Group</button>
      </div>
    </form>
  `;
  
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);
  
  // Auto-update emoji based on group type selection
  const groupTypeSelect = document.getElementById('groupType');
  const selectedEmojiInput = document.getElementById('selectedEmoji');
  
  groupTypeSelect.addEventListener('change', function() {
    const typeEmojiMap = {
      'family': '👨‍👩‍👧‍👦',
      'couple': '💑',
      'friends': '👥',
      'household': '🏠',
      'work': '💼',
      'roommates': '🏨',
      'travel': '✈️',
      'study': '📚'
    };
    
    const newEmoji = typeEmojiMap[this.value];
    if (newEmoji) {
      // Update selected emoji
      selectedEmojiInput.value = newEmoji;
      
      // Update emoji button selection
      document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.style.border = '2px solid transparent';
        btn.style.backgroundColor = isDarkMode ? '#475569' : '#e2e8f0';
      });
      
      const targetBtn = document.querySelector(`[data-emoji="${newEmoji}"]`);
      if (targetBtn) {
        targetBtn.classList.add('selected');
        targetBtn.style.border = '2px solid #667eea';
        targetBtn.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
      }
    }
  });
  
  // Handle emoji selection
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove selection from all buttons
      document.querySelectorAll('.emoji-btn').forEach(b => {
        b.classList.remove('selected');
        b.style.border = '2px solid transparent';
        b.style.backgroundColor = isDarkMode ? '#475569' : '#e2e8f0';
      });
      
      // Select this button
      this.classList.add('selected');
      this.style.border = '2px solid #667eea';
      this.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
      selectedEmojiInput.value = this.dataset.emoji;
    });
  });
  
  // Handle form submission
  document.getElementById('createGroupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('createGroupSubmit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating...';
    submitBtn.disabled = true;
    
    try {
      const groupData = {
        name: document.getElementById('groupName').value.trim(),
        type: document.getElementById('groupType').value,
        emoji: document.getElementById('selectedEmoji').value,
        description: document.getElementById('groupDescription').value.trim(),
        inviteCode: generateInviteCode(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        members: [{
          userId: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || currentUser.email,
          role: 'owner',
          joinedAt: new Date().toISOString()
        }]
      };
      
      // Add group to Firestore
      const docRef = await addDoc(collection(db, 'Groups'), groupData);
      const newGroupId = docRef.id;
      
      // Add to local groups array
      const newGroup = {
        id: newGroupId,
        ...groupData
      };
      groups.push(newGroup);
      
      // Switch to the new group
      switchToGroup(newGroupId);
      
      // Close modal
      document.body.removeChild(modalOverlay);
      
      // Show success message
      showSuccessMessage(`Group "${groupData.name}" created successfully!`);
      
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Error creating group. Please try again.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
  
  // Handle close events
  function closeModal() {
    document.body.removeChild(modalOverlay);
  }
  
  document.getElementById('closeCreateModal').addEventListener('click', closeModal);
  document.getElementById('cancelCreateGroup').addEventListener('click', closeModal);
  
  // Close on overlay click
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // Focus the group name input
  setTimeout(() => {
    document.getElementById('groupName').focus();
  }, 100);
}

function openJoinGroupModal() {
  closeGroupSwitcher();
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: ${isDarkMode ? '#1e293b' : '#ffffff'};
    border-radius: 20px;
    padding: 32px;
    width: 100%;
    max-width: 460px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
  `;
  
  modal.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    ">
      <h2 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      ">Join Group</h2>
      <button id="closeJoinModal" style="
        width: 32px;
        height: 32px;
        border: none;
        background: ${isDarkMode ? '#334155' : '#f1f5f9'};
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        font-size: 18px;
        transition: all 0.2s;
      ">×</button>
    </div>
    
    <div style="
      text-align: center;
      margin-bottom: 32px;
      padding: 24px;
      background: ${isDarkMode ? '#334155' : '#f8fafc'};
      border-radius: 16px;
      border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
    ">
      <div style="
        font-size: 48px;
        margin-bottom: 16px;
      ">🎫</div>
      <h3 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0 0 12px 0;
        font-size: 18px;
        font-weight: 600;
      ">Enter Invitation Code</h3>
      <p style="
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
      ">Ask a group member to share their invitation code with you</p>
    </div>
    
    <form id="joinGroupForm">
      <div style="margin-bottom: 24px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#cbd5e1' : '#374151'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">Invitation Code *</label>
        <input type="text" id="inviteCode" required maxlength="20" style="
          width: 100%;
          height: 56px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 20px;
          background-color: ${isDarkMode ? '#334155' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 2px;
          text-align: center;
          text-transform: uppercase;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s;
        " placeholder="ENTER-CODE">
        <div id="codeError" style="
          color: #ef4444;
          font-size: 14px;
          margin-top: 8px;
          display: none;
        "></div>
        <div id="codeSuccess" style="
          color: #10b981;
          font-size: 14px;
          margin-top: 8px;
          display: none;
        "></div>
      </div>
      
      <div id="groupPreview" style="
        display: none;
        margin-bottom: 24px;
        padding: 20px;
        background: ${isDarkMode ? '#334155' : '#f8fafc'};
        border-radius: 12px;
        border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
      ">
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 16px;
        ">
          <div id="previewEmoji" style="
            font-size: 32px;
            margin-right: 12px;
          "></div>
          <div>
            <div id="previewName" style="
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 4px;
            "></div>
            <div id="previewType" style="
              color: ${isDarkMode ? '#94a3b8' : '#64748b'};
              font-size: 14px;
            "></div>
          </div>
        </div>
        <div id="previewDescription" style="
          color: ${isDarkMode ? '#cbd5e1' : '#475569'};
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 12px;
        "></div>
        <div id="previewMembers" style="
          color: ${isDarkMode ? '#94a3b8' : '#64748b'};
          font-size: 12px;
        "></div>
      </div>
      
      <div style="
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      ">
        <button type="button" id="cancelJoinGroup" style="
          padding: 12px 24px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          background-color: transparent;
          color: ${isDarkMode ? '#cbd5e1' : '#64748b'};
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">Cancel</button>
        <button type="submit" id="joinGroupSubmit" style="
          padding: 12px 24px;
          border: none;
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 120px;
          opacity: 0.5;
        " disabled>Join Group</button>
      </div>
    </form>
  `;
  
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);
  
  const inviteCodeInput = document.getElementById('inviteCode');
  const codeError = document.getElementById('codeError');
  const codeSuccess = document.getElementById('codeSuccess');
  const groupPreview = document.getElementById('groupPreview');
  const joinButton = document.getElementById('joinGroupSubmit');
  
  let debounceTimer = null;
  let currentGroup = null;
  
  // Debounced code validation
  inviteCodeInput.addEventListener('input', function() {
    const code = this.value.trim().toUpperCase();
    
    // Clear previous states
    codeError.style.display = 'none';
    codeSuccess.style.display = 'none';
    groupPreview.style.display = 'none';
    joinButton.disabled = true;
    joinButton.style.opacity = '0.5';
    currentGroup = null;
    
    if (code.length < 6) return;
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        // Query groups by invite code
        const groupQuery = query(
          collection(db, 'Groups'),
          where('inviteCode', '==', code)
        );
        const snapshot = await getDocs(groupQuery);
        
        if (snapshot.empty) {
          codeError.textContent = 'Invalid invitation code';
          codeError.style.display = 'block';
          return;
        }
        
        const groupDoc = snapshot.docs[0];
        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        
        // Check if user is already a member
        if (groupData.members && groupData.members.some(member => member.userId === currentUser.uid)) {
          codeError.textContent = 'You are already a member of this group';
          codeError.style.display = 'block';
          return;
        }
        
        // Show group preview
        currentGroup = groupData;
        document.getElementById('previewEmoji').textContent = groupData.emoji || '👥';
        document.getElementById('previewName').textContent = groupData.name;
        document.getElementById('previewType').textContent = groupData.type ? `${groupData.type.charAt(0).toUpperCase()}${groupData.type.slice(1)} Group` : 'Group';
        document.getElementById('previewDescription').textContent = groupData.description || 'No description provided';
        document.getElementById('previewMembers').textContent = `${groupData.members ? groupData.members.length : 0} member(s)`;
        
        groupPreview.style.display = 'block';
        codeSuccess.textContent = 'Group found! Ready to join';
        codeSuccess.style.display = 'block';
        joinButton.disabled = false;
        joinButton.style.opacity = '1';
        
      } catch (error) {
        console.error('Error validating invite code:', error);
        codeError.textContent = 'Error validating code. Please try again.';
        codeError.style.display = 'block';
      }
    }, 800);
  });
  
  // Handle form submission
  document.getElementById('joinGroupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentGroup) return;
    
    const submitBtn = document.getElementById('joinGroupSubmit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Joining...';
    submitBtn.disabled = true;
    
    try {
      // Add user to group members
      const updatedMembers = [...(currentGroup.members || []), {
        userId: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName || currentUser.email,
        role: 'member',
        joinedAt: new Date().toISOString()
      }];
      
      await updateDoc(doc(db, 'Groups', currentGroupId), {
        members: updatedMembers
      });
      
      // Add group to local groups array
      const newGroup = {
        ...currentGroup,
        members: updatedMembers
      };
      groups.push(newGroup);
      
      // Switch to the new group
      switchToGroup(currentGroupId);
      
      // Close modal
      document.body.removeChild(modalOverlay);
      
      // Show success message
      showSuccessMessage(`Successfully joined "${currentGroup.name}"!`);
      
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Error joining group. Please try again.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
  
  // Handle close events
  function closeModal() {
    document.body.removeChild(modalOverlay);
  }
  
  document.getElementById('closeJoinModal').addEventListener('click', closeModal);
  document.getElementById('cancelJoinGroup').addEventListener('click', closeModal);
  
  // Close on overlay click
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // Focus the invite code input
  setTimeout(() => {
    document.getElementById('inviteCode').focus();
  }, 100);
}

// Real-time listeners with group context
let todosUnsubscribe = null;
let groceriesUnsubscribe = null;
let eventsUnsubscribe = null;
let tagsUnsubscribe = null;
let groupsUnsubscribe = null;

function setupRealtimeListeners() {
  // Clean up existing listeners
  if (todosUnsubscribe) todosUnsubscribe();
  if (groceriesUnsubscribe) groceriesUnsubscribe();
  if (eventsUnsubscribe) eventsUnsubscribe();
  if (tagsUnsubscribe) tagsUnsubscribe();
  if (groupsUnsubscribe) groupsUnsubscribe();
  
  // Use currentGroupId directly instead of getCurrentGroup() which might fallback incorrectly
  console.log('Setting up realtime listeners for group ID:', currentGroupId);
  
  // Set up queries based on group type
  let todosQuery, groceriesQuery, eventsQuery, tagsQuery;
  
  if (currentGroupId === 'personal') {
    // Personal lists - filter by userId and no groupId (or null groupId)
    todosQuery = query(
      collection(db, 'todos'), 
      where('userId', '==', currentUser.uid),
      where('groupId', '==', null)
    );
    groceriesQuery = query(
      collection(db, 'groceries'), 
      where('userId', '==', currentUser.uid),
      where('groupId', '==', null)
    );
    eventsQuery = query(
      collection(db, 'events'), 
      where('userId', '==', currentUser.uid),
      where('groupId', '==', null)
    );
    tagsQuery = query(
      collection(db, 'tags'), 
      where('userId', '==', currentUser.uid),
      where('groupId', '==', null)
    );
  } else {
    // Group lists - filter by groupId
    todosQuery = query(
      collection(db, 'todos'), 
      where('groupId', '==', currentGroupId)
    );
    groceriesQuery = query(
      collection(db, 'groceries'), 
      where('groupId', '==', currentGroupId)
    );
    eventsQuery = query(
      collection(db, 'events'), 
      where('groupId', '==', currentGroupId)
    );
    tagsQuery = query(
      collection(db, 'tags'), 
      where('groupId', '==', currentGroupId)
    );
  }
  
  // Set up listeners
  todosUnsubscribe = onSnapshot(todosQuery, (snapshot) => {
    console.log(`[TODOS] Received ${snapshot.docs.length} docs for group ${currentGroupId}:`, snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    
    todos = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(todo => {
        // Show all todos in personal space
        if (currentGroupId === 'personal') return true;
        
        // In groups, show public todos and user's own private todos
        return !todo.isPrivate || todo.userId === currentUser.uid;
      });
    console.log(`[TODOS] Final filtered todos for group ${currentGroupId}:`, todos);
    renderTodos();
  });
  
  groceriesUnsubscribe = onSnapshot(groceriesQuery, (snapshot) => {
    console.log(`[GROCERIES] Received ${snapshot.docs.length} docs for group ${currentGroupId}`);
    
    groceries = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(grocery => {
        // Show all groceries in personal space
        if (currentGroupId === 'personal') return true;
        
        // In groups, show public groceries and user's own private groceries
        return !grocery.isPrivate || grocery.userId === currentUser.uid;
      });
    renderGroceries();
  });
  
  eventsUnsubscribe = onSnapshot(eventsQuery, (snapshot) => {
    console.log(`[EVENTS] Received ${snapshot.docs.length} docs for group ${currentGroupId}`);
    
    events = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(event => {
        // Show all events in personal space
        if (currentGroupId === 'personal') return true;
        
        // In groups, show public events and user's own private events
        return !event.isPrivate || event.userId === currentUser.uid;
      });
    renderEvents();
  });
  
  tagsUnsubscribe = onSnapshot(tagsQuery, (snapshot) => {
    console.log(`[TAGS] Received ${snapshot.docs.length} docs for group ${currentGroupId}`);
    
    tags = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Refresh todos view if it's active to update category filters
    if (document.getElementById('todosList')) {
      loadTabContent('todos');
    }
  });
  
  // Set up real-time groups listener
  groupsUnsubscribe = onSnapshot(collection(db, 'Groups'), (snapshot) => {
    // Filter groups where user is a member and check for changes
    const updatedGroups = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(group => 
        group.members && group.members.some(member => member.userId === currentUser?.uid)
      );
    
    // Check if groups changed
    const groupsChanged = groups.length !== updatedGroups.length || 
      groups.some(group => !updatedGroups.find(newGroup => newGroup.id === group.id)) ||
      updatedGroups.some(newGroup => {
        const oldGroup = groups.find(g => g.id === newGroup.id);
        return !oldGroup || JSON.stringify(oldGroup) !== JSON.stringify(newGroup);
      });
    
    if (groupsChanged) {
      console.log('Groups updated in real-time:', updatedGroups);
      groups = updatedGroups;
      
      // Load user profiles for group members
      loadUserProfiles(groups);
      
      // Apply group theme now that groups are loaded
      applyGroupTheme();
      
      // Refresh UI with correct group context now that groups are loaded
      const activeTab = document.querySelector('.nav-tab.active');
      if (activeTab) {
        loadTabContent(activeTab.dataset.tab);
      }
      
      // Check if current group still exists and user is still a member
      if (currentGroupId !== 'personal') {
        const currentGroup = groups.find(g => g.id === currentGroupId);
        if (!currentGroup) {
          // Current group no longer exists or user was removed, switch to personal
          console.log('Current group no longer available, switching to personal');
          switchToGroup('personal');
          showSuccessMessage('You were removed from the group or it was deleted. Switched to personal space.');
        }
      }
      
      // Update group switcher if it's open
      const groupSwitcherModal = document.getElementById('groupSwitcherModal');
      if (groupSwitcherModal && groupSwitcherModal.style.display === 'flex') {
        renderGroupsList();
      }
    }
  });
}

// Load groups from Firebase
function renderGroupDetails() {
  const currentGroup = getCurrentGroup();
  const groupDetailsContent = document.getElementById('groupDetailsContent');
  if (!groupDetailsContent) return;
  
  const isOwner = currentGroup.members?.some(m => m.userId === currentUser?.uid && m.role === 'owner');
  const isCoOwner = currentGroup.members?.some(m => m.userId === currentUser?.uid && m.role === 'co-owner');
  const canManage = isOwner || isCoOwner;
  
  const members = currentGroup.members || [];
  const memberCount = members.length;
  
  groupDetailsContent.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    ">
      <h3 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      ">Group Details</h3>
      <button id="closeGroupDetails" style="
        width: 32px;
        height: 32px;
        border: none;
        background: none;
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        cursor: pointer;
        font-size: 20px;
        border-radius: 8px;
        transition: all 0.2s;
      " onclick="closeGroupDetails()">×</button>
    </div>
    
    <!-- Group Info -->
    <div style="
      background: ${isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 0.8)'};
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    ">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="font-size: 32px;">${currentGroup.emoji}</span>
        <div>
          <h4 style="
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            margin: 0;
            font-size: 18px;
            font-weight: 600;
          ">${currentGroup.name}</h4>
          <p style="
            color: ${isDarkMode ? '#94a3b8' : '#64748b'};
            margin: 0;
            font-size: 14px;
          ">${currentGroup.type === 'personal' ? 'Personal Space' : 'Shared Group'}</p>
        </div>
      </div>
      ${currentGroup.description ? `
        <p style="
          color: ${isDarkMode ? '#cbd5e1' : '#475569'};
          margin: 8px 0;
          font-size: 14px;
        ">${currentGroup.description}</p>
      ` : ''}
    </div>
    
    <!-- Members Section -->
    <div style="margin-bottom: 24px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      ">
        <h4 style="
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        ">Members (${memberCount})</h4>
        ${canManage && currentGroup.type !== 'personal' ? `
          <button id="inviteMemberBtn" style="
            padding: 8px 16px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          ">+ Invite</button>
        ` : ''}
      </div>
      
      <div id="membersList">
        ${members.map(member => {
          const isCurrentUser = member.userId === currentUser?.uid;
          const avatarText = getUserAvatar(member);
          const avatarColor = getAvatarColor(member.userId);
          const roleIcon = {
            'owner': '👑',
            'co-owner': '⭐',
            'member': '👤'
          }[member.role] || '👤';
          
          return `
            <div style="
              display: flex;
              align-items: center;
              padding: 12px;
              background: ${isDarkMode ? 'rgba(51, 65, 85, 0.3)' : 'rgba(248, 250, 252, 0.6)'};
              border-radius: 12px;
              margin-bottom: 8px;
            ">
              <div style="
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: ${/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(avatarText) ? 'rgba(16, 185, 129, 0.1)' : avatarColor + '20'};
                border: 2px solid ${/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(avatarText) ? 'rgba(16, 185, 129, 0.3)' : avatarColor};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(avatarText) ? '24px' : '16px'};
                font-weight: 600;
                color: ${/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(avatarText) ? 'inherit' : avatarColor};
                margin-right: 12px;
              ">${avatarText}</div>
              
              <div style="flex: 1;">
                <div style="
                  color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
                  font-weight: 600;
                  font-size: 14px;
                ">${member.name || member.email}${isCurrentUser ? ' (You)' : ''}</div>
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  margin-top: 2px;
                ">
                  <span style="font-size: 12px;">${roleIcon}</span>
                  <span style="
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                    font-size: 12px;
                    text-transform: capitalize;
                  ">${member.role.replace('-', ' ')}</span>
                </div>
              </div>
              
              ${canManage && !isCurrentUser && currentGroup.type !== 'personal' ? `
                <div style="display: flex; gap: 4px;">
                  ${isOwner && member.role === 'member' ? `
                    <button onclick="promoteMember('${currentGroup.id}', '${member.userId}', '${member.name || member.email}')" style="
                      padding: 6px 12px;
                      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                      color: white;
                      border: none;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 600;
                      cursor: pointer;
                    ">Make Co-owner</button>
                  ` : ''}
                  ${isOwner && member.role === 'co-owner' ? `
                    <button onclick="demoteMember('${currentGroup.id}', '${member.userId}', '${member.name || member.email}')" style="
                      padding: 6px 12px;
                      background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
                      color: white;
                      border: none;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 600;
                      cursor: pointer;
                    ">Remove Co-owner</button>
                  ` : ''}
                  <button onclick="removeMember('${currentGroup.id}', '${member.userId}', '${member.name || member.email}')" style="
                    padding: 6px 12px;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                  ">Remove</button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
    
    ${isOwner && currentGroup.type !== 'personal' ? `
      <!-- Delete Group Section -->
      <div style="
        background: ${isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(254, 226, 226, 1)'};
        border: 1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'};
        border-radius: 12px;
        padding: 16px;
        margin-top: 24px;
      ">
        <h4 style="
          color: ${isDarkMode ? '#fca5a5' : '#dc2626'};
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        ">Danger Zone</h4>
        <p style="
          color: ${isDarkMode ? '#fca5a5' : '#991b1b'};
          margin: 0 0 12px 0;
          font-size: 14px;
        ">Permanently delete this group and all its data. This action cannot be undone.</p>
        <button id="deleteGroupBtn" onclick="deleteGroup('${currentGroup.id}', '${currentGroup.name}')" style="
          padding: 10px 16px;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">Delete Group</button>
      </div>
    ` : ''}
  `;
  
  // Add event listener for close button click outside modal
  document.getElementById('groupDetailsModal').addEventListener('click', (e) => {
    if (e.target.id === 'groupDetailsModal') {
      closeGroupDetails();
    }
  });

  // Add event listener for close button
  const closeBtn = document.getElementById('closeGroupDetails');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeGroupDetails);
  }

  // Add event listener for invite button
  const inviteBtn = document.getElementById('inviteMemberBtn');
  if (inviteBtn) {
    inviteBtn.addEventListener('click', () => {
      showInviteCodeModal(currentGroup);
    });
  }
}

async function loadUserGroups() {
  if (!currentUser) return;
  
  try {
    // For now, get all groups and filter client-side
    // In production, you'd want a better indexing strategy
    const snapshot = await getDocs(collection(db, 'Groups'));
    
    // Filter groups where user is a member
    groups = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(group => 
        group.members && group.members.some(member => member.userId === currentUser.uid)
      );
    
    console.log('Loaded groups:', groups);
  } catch (error) {
    console.error('Error loading groups:', error);
    groups = []; // Set to empty array on error
  }
}

// Generate user avatar initials
function getUserAvatar(user) {
  if (!user) return '👤';
  
  // Check if we have the user's profile with emoji
  const userProfile = userProfiles[user.userId];
  if (userProfile && userProfile.avatarEmoji) {
    return userProfile.avatarEmoji;
  }
  
  // Fallback to initials
  const name = user.name || user.email || '';
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  
  return initials || '👤';
}

// Generate avatar color based on user ID
function getAvatarColor(userId) {
  if (!userId) return '#6b7280';
  
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Check for recent activity in a group
function getGroupActivity(groupId) {
  if (groupId === 'personal') return null;
  
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Check for recent activity in todos, groceries, events
  const allGroupItems = [
    ...todos.filter(item => item.groupId === groupId),
    ...groceries.filter(item => item.groupId === groupId),
    ...events.filter(item => item.groupId === groupId)
  ];
  
  let recentActivity = false;
  let veryRecentActivity = false;
  let lastActivityTime = null;
  
  allGroupItems.forEach(item => {
    const itemDate = item.createdAt?.toDate?.() || new Date(item.createdAt);
    if (itemDate > oneDayAgo) {
      recentActivity = true;
      if (itemDate > oneHourAgo) {
        veryRecentActivity = true;
      }
      if (!lastActivityTime || itemDate > lastActivityTime) {
        lastActivityTime = itemDate;
      }
    }
  });
  
  return {
    hasRecentActivity: recentActivity,
    hasVeryRecentActivity: veryRecentActivity,
    lastActivityTime: lastActivityTime
  };
}

// Format relative time
function getRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Calculate group statistics
function getGroupStatistics(groupId) {
  if (groupId === 'personal') {
    const personalTodos = todos.filter(t => !t.groupId);
    const personalGroceries = groceries.filter(g => !g.groupId);
    const personalEvents = events.filter(e => !e.groupId);
    
    return {
      totalItems: personalTodos.length + personalGroceries.length + personalEvents.length,
      completedTodos: personalTodos.filter(t => t.completed).length,
      totalTodos: personalTodos.length,
      completedGroceries: personalGroceries.filter(g => g.completed).length,
      totalGroceries: personalGroceries.length,
      upcomingEvents: personalEvents.filter(e => {
        const eventDate = e.datetime?.toDate?.() || new Date(e.datetime);
        return eventDate > new Date();
      }).length,
      totalEvents: personalEvents.length
    };
  }
  
  // Group statistics
  const groupTodos = todos.filter(t => t.groupId === groupId);
  const groupGroceries = groceries.filter(g => g.groupId === groupId);
  const groupEvents = events.filter(e => e.groupId === groupId);
  
  const memberStats = {};
  const group = groups.find(g => g.id === groupId);
  
  if (group?.members) {
    group.members.forEach(member => {
      const memberTodos = groupTodos.filter(t => t.userId === member.userId);
      const memberGroceries = groupGroceries.filter(g => g.userId === member.userId);
      const memberEvents = groupEvents.filter(e => e.userId === member.userId);
      
      memberStats[member.userId] = {
        name: member.name || member.email,
        totalContributions: memberTodos.length + memberGroceries.length + memberEvents.length,
        completedTodos: memberTodos.filter(t => t.completed).length,
        totalTodos: memberTodos.length,
        completedGroceries: memberGroceries.filter(g => g.completed).length,
        totalGroceries: memberGroceries.length,
        totalEvents: memberEvents.length
      };
    });
  }
  
  return {
    totalItems: groupTodos.length + groupGroceries.length + groupEvents.length,
    completedTodos: groupTodos.filter(t => t.completed).length,
    totalTodos: groupTodos.length,
    completedGroceries: groupGroceries.filter(g => g.completed).length,
    totalGroceries: groupGroceries.length,
    upcomingEvents: groupEvents.filter(e => {
      const eventDate = e.datetime?.toDate?.() || new Date(e.datetime);
      return eventDate > new Date();
    }).length,
    totalEvents: groupEvents.length,
    memberStats: memberStats,
    completionRate: Math.round((groupTodos.filter(t => t.completed).length + groupGroceries.filter(g => g.completed).length) / (groupTodos.length + groupGroceries.length) * 100) || 0
  };
}

// Group color themes
const groupColorThemes = {
  personal: {
    primary: '#667eea',
    secondary: '#764ba2',
    accent: '#6366f1',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  family: {
    primary: '#10b981',
    secondary: '#34d399',
    accent: '#059669',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
  },
  couple: {
    primary: '#ec4899',
    secondary: '#f472b6',
    accent: '#db2777',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)'
  },
  friends: {
    primary: '#f59e0b',
    secondary: '#fbbf24',
    accent: '#d97706',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
  },
  household: {
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    accent: '#7c3aed',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
  },
  work: {
    primary: '#06b6d4',
    secondary: '#22d3ee',
    accent: '#0891b2',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)'
  },
  roommates: {
    primary: '#14b8a6',
    secondary: '#5eead4',
    accent: '#0f766e',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #5eead4 100%)'
  },
  travel: {
    primary: '#f97316',
    secondary: '#fb923c',
    accent: '#ea580c',
    gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
  },
  study: {
    primary: '#6366f1',
    secondary: '#818cf8',
    accent: '#4f46e5',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)'
  }
};

// Get theme for current group
function getCurrentGroupTheme() {
  const currentGroup = getCurrentGroup();
  const groupType = currentGroup.type || 'personal';
  
  return groupColorThemes[groupType] || groupColorThemes.personal;
}

// Apply group theme to CSS variables
function applyGroupTheme() {
  const theme = getCurrentGroupTheme();
  
  // Create or update CSS custom properties
  let themeStyle = document.getElementById('group-theme-style');
  if (!themeStyle) {
    themeStyle = document.createElement('style');
    themeStyle.id = 'group-theme-style';
    document.head.appendChild(themeStyle);
  }
  
  themeStyle.textContent = `
    :root {
      --group-primary: ${theme.primary};
      --group-secondary: ${theme.secondary};
      --group-accent: ${theme.accent};
      --group-gradient: ${theme.gradient};
    }
    
    /* Apply theme to key UI elements */
    .nav-tab.active {
      background: var(--group-gradient) !important;
      color: white !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4) !important;
    }
    
    .nav-tab:not(.active) {
      background: ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(255, 255, 255, 0.15)'} !important;
      color: ${isDarkMode ? '#e2e8f0' : '#1a202c'} !important;
      box-shadow: none !important;
    }
    
    .primary-btn {
      background: var(--group-gradient) !important;
    }
    
    .accent-color {
      color: var(--group-primary) !important;
    }
    
    .accent-bg {
      background: var(--group-primary) !important;
    }
    
    .group-themed-gradient {
      background: var(--group-gradient) !important;
    }
    
    /* Theme specific animations */
    .group-pulse {
      animation: groupPulse 2s infinite;
    }
    
    @keyframes groupPulse {
      0%, 100% { 
        box-shadow: 0 0 0 0 ${theme.primary}40;
      }
      50% { 
        box-shadow: 0 0 0 10px ${theme.primary}00;
      }
    }
  `;
}

// Generate unique invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = [];
  
  // Generate 3 segments of 4 characters each (e.g., ABCD-EFGH-1234)
  for (let segment = 0; segment < 3; segment++) {
    let segmentStr = '';
    for (let i = 0; i < 4; i++) {
      segmentStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segmentStr);
  }
  
  return segments.join('-');
}

// Success message utility
function showSuccessMessage(message) {
  // Create success notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
    z-index: 10001;
    transform: translateX(400px);
    transition: all 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Show invite code modal for sharing
function showInviteCode(groupId, inviteCode) {
  const group = groups.find(g => g.id === groupId);
  if (!group || !inviteCode) return;
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: ${isDarkMode ? '#1e293b' : '#ffffff'};
    border-radius: 20px;
    padding: 32px;
    width: 100%;
    max-width: 460px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
  `;
  
  modal.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    ">
      <h2 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      ">Invite to ${group.name}</h2>
      <button id="closeInviteModal" style="
        width: 32px;
        height: 32px;
        border: none;
        background: ${isDarkMode ? '#334155' : '#f1f5f9'};
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        font-size: 18px;
        transition: all 0.2s;
      ">×</button>
    </div>
    
    <div style="
      text-align: center;
      margin-bottom: 32px;
      padding: 24px;
      background: ${isDarkMode ? '#334155' : '#f8fafc'};
      border-radius: 16px;
      border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
    ">
      <div style="
        font-size: 48px;
        margin-bottom: 16px;
      ">${group.emoji || '👥'}</div>
      <h3 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0 0 12px 0;
        font-size: 18px;
        font-weight: 600;
      ">Share this code</h3>
      <p style="
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
      ">Others can use this code to join "${group.name}"</p>
    </div>
    
    <div style="margin-bottom: 24px;">
      <label style="
        display: block;
        color: ${isDarkMode ? '#cbd5e1' : '#374151'};
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 8px;
      ">Invitation Code</label>
      <div style="
        display: flex;
        gap: 12px;
        align-items: center;
      ">
        <input type="text" id="inviteCodeDisplay" readonly value="${inviteCode}" style="
          flex: 1;
          height: 56px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 20px;
          background-color: ${isDarkMode ? '#334155' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 2px;
          text-align: center;
          outline: none;
          box-sizing: border-box;
          cursor: text;
        ">
        <button id="copyCodeBtn" style="
          height: 56px;
          padding: 0 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        ">📋 Copy</button>
      </div>
      <div id="copyStatus" style="
        color: #10b981;
        font-size: 14px;
        margin-top: 8px;
        display: none;
      ">Code copied to clipboard!</div>
    </div>
    
    <div style="
      padding: 20px;
      background: ${isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)'};
      border-radius: 12px;
      border: 1px solid rgba(16, 185, 129, 0.2);
      margin-bottom: 24px;
    ">
      <div style="
        display: flex;
        align-items: center;
        margin-bottom: 12px;
      ">
        <span style="font-size: 20px; margin-right: 8px;">💡</span>
        <div style="
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 14px;
          font-weight: 600;
        ">How to share</div>
      </div>
      <ul style="
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        font-size: 14px;
        line-height: 1.5;
        margin: 0;
        padding-left: 20px;
      ">
        <li>Copy the code and share it with others</li>
        <li>They can join by clicking "📧 Join Group" in AdiDo</li>
        <li>The code never expires unless you regenerate it</li>
      </ul>
    </div>
    
    <div style="
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    ">
      <button id="regenerateCode" style="
        padding: 12px 24px;
        border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
        background-color: transparent;
        color: ${isDarkMode ? '#cbd5e1' : '#64748b'};
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      ">Regenerate Code</button>
      <button id="closeInviteModalBtn" style="
        padding: 12px 24px;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      ">Done</button>
    </div>
  `;
  
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);
  
  // Copy functionality
  document.getElementById('copyCodeBtn').addEventListener('click', async function() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      document.getElementById('copyStatus').style.display = 'block';
      setTimeout(() => {
        const status = document.getElementById('copyStatus');
        if (status) status.style.display = 'none';
      }, 3000);
    } catch (error) {
      // Fallback for older browsers
      const input = document.getElementById('inviteCodeDisplay');
      input.select();
      document.execCommand('copy');
      document.getElementById('copyStatus').style.display = 'block';
      setTimeout(() => {
        const status = document.getElementById('copyStatus');
        if (status) status.style.display = 'none';
      }, 3000);
    }
  });
  
  // Regenerate code functionality
  document.getElementById('regenerateCode').addEventListener('click', async function() {
    const btn = this;
    const originalText = btn.textContent;
    btn.textContent = 'Regenerating...';
    btn.disabled = true;
    
    try {
      const newCode = generateInviteCode();
      await updateDoc(doc(db, 'Groups', groupId), {
        inviteCode: newCode
      });
      
      // Update local group data
      const groupIndex = groups.findIndex(g => g.id === groupId);
      if (groupIndex !== -1) {
        groups[groupIndex].inviteCode = newCode;
      }
      
      // Update the input display
      document.getElementById('inviteCodeDisplay').value = newCode;
      
      showSuccessMessage('New invitation code generated!');
      
    } catch (error) {
      console.error('Error regenerating code:', error);
      alert('Error regenerating code. Please try again.');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
  
  // Handle close events
  function closeModal() {
    document.body.removeChild(modalOverlay);
  }
  
  document.getElementById('closeInviteModal').addEventListener('click', closeModal);
  document.getElementById('closeInviteModalBtn').addEventListener('click', closeModal);
  
  // Close on overlay click
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // Select the code for easy copying
  setTimeout(() => {
    document.getElementById('inviteCodeDisplay').select();
  }, 100);
}

// Show member management modal
function showMemberManagement(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  
  const currentUserMember = group.members?.find(m => m.userId === currentUser?.uid);
  const isOwner = currentUserMember?.role === 'owner';
  const isAdmin = currentUserMember?.role === 'admin';
  const canManage = isOwner || isAdmin;
  
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    padding: 20px;
    box-sizing: border-box;
  `;
  
  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: ${isDarkMode ? '#1e293b' : '#ffffff'};
    border-radius: 20px;
    padding: 32px;
    width: 100%;
    max-width: 520px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
  `;
  
  const membersList = group.members?.map(member => {
    const isCurrentUser = member.userId === currentUser?.uid;
    const canChangeRole = canManage && !isCurrentUser && member.role !== 'owner';
    const canRemove = canManage && !isCurrentUser && (isOwner || member.role === 'member');
    
    const roleColor = {
      owner: '#f59e0b',
      admin: '#8b5cf6',
      member: '#6b7280'
    }[member.role] || '#6b7280';
    
    const roleEmoji = {
      owner: '👑',
      admin: '⭐',
      member: '👤'
    }[member.role] || '👤';
    
    return `
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        background: ${isDarkMode ? 'rgba(40, 40, 40, 0.5)' : 'rgba(248, 250, 252, 0.8)'};
        border-radius: 12px;
        margin-bottom: 12px;
        border: 1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.5)'};
      ">
        <div style="display: flex; align-items: center; flex: 1;">
          <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, ${roleColor}20 0%, ${roleColor}40 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 16px;
          ">${roleEmoji}</div>
          <div style="flex: 1;">
            <div style="
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
              font-weight: 600;
              font-size: 14px;
              margin-bottom: 2px;
            ">${member.name || member.email}${isCurrentUser ? ' (You)' : ''}</div>
            <div style="
              color: ${isDarkMode ? '#94a3b8' : '#64748b'};
              font-size: 12px;
            ">${member.email}</div>
          </div>
          <div style="
            background: ${roleColor}20;
            color: ${roleColor};
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            border: 1px solid ${roleColor}40;
          ">${member.role}</div>
        </div>
        
        ${(canChangeRole || canRemove) ? `
          <div style="display: flex; align-items: center; gap: 8px; margin-left: 16px;">
            ${canChangeRole ? `
              <button onclick="changeMemberRole('${groupId}', '${member.userId}', '${member.role}')" style="
                padding: 6px 12px;
                background: rgba(139, 92, 246, 0.1);
                color: #8b5cf6;
                border: 1px solid #8b5cf6;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              " title="Change role">⚙️</button>
            ` : ''}
            ${canRemove ? `
              <button onclick="removeMember('${groupId}', '${member.userId}', '${member.name || member.email}')" style="
                padding: 6px 12px;
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                border: 1px solid #ef4444;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              " title="Remove member">🗑️</button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('') || '<div style="text-align: center; color: #94a3b8; padding: 20px;">No members found</div>';
  
  modal.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    ">
      <h2 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      ">${group.emoji} ${group.name} Members</h2>
      <button id="closeMembersModal" style="
        width: 32px;
        height: 32px;
        border: none;
        background: ${isDarkMode ? '#334155' : '#f1f5f9'};
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        font-size: 18px;
        transition: all 0.2s;
      ">×</button>
    </div>
    
    <div style="
      background: ${isDarkMode ? '#334155' : '#f8fafc'};
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
      border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
    ">
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      ">
        <h3 style="
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        ">Group Members (${group.members?.length || 0})</h3>
        ${canManage ? `
          <button onclick="showInviteCode('${groupId}', '${group.inviteCode || ''}')" style="
            padding: 8px 16px;
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">+ Invite More</button>
        ` : ''}
      </div>
      
      <div style="max-height: 400px; overflow-y: auto;">
        ${membersList}
      </div>
    </div>
    
    ${isOwner ? `
      <div style="
        padding: 20px;
        background: rgba(239, 68, 68, 0.05);
        border-radius: 12px;
        border: 1px solid rgba(239, 68, 68, 0.2);
        margin-bottom: 24px;
      ">
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        ">
          <span style="font-size: 20px; margin-right: 8px;">⚠️</span>
          <div style="
            color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
            font-size: 14px;
            font-weight: 600;
          ">Danger Zone</div>
        </div>
        <div style="
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        ">
          <button id="transferOwnership" style="
            padding: 8px 16px;
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid #ef4444;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">👑 Transfer Ownership</button>
          <button id="deleteGroup" style="
            padding: 8px 16px;
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid #ef4444;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">🗑️ Delete Group</button>
        </div>
      </div>
    ` : ''}
    
    <div style="
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    ">
      <button id="closeMembersModalBtn" style="
        padding: 12px 24px;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      ">Done</button>
    </div>
  `;
  
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);
  
  // Handle close events
  function closeModal() {
    document.body.removeChild(modalOverlay);
  }
  
  document.getElementById('closeMembersModal').addEventListener('click', closeModal);
  document.getElementById('closeMembersModalBtn').addEventListener('click', closeModal);
  
  // Close on overlay click
  modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // Danger zone actions (only for owners)
  if (isOwner) {
    document.getElementById('transferOwnership')?.addEventListener('click', () => {
      closeModal();
      // showTransferOwnership(groupId);
      alert('Transfer ownership feature coming soon!');
    });
    
    document.getElementById('deleteGroup')?.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete "${group.name}"? This action cannot be undone and will remove all group data including todos, groceries, and events.`)) {
        deleteGroup(groupId);
        closeModal();
      }
    });
  }
}

// Change member role
async function changeMemberRole(groupId, userId, currentRole) {
  const roles = ['member', 'admin'];
  const newRole = currentRole === 'member' ? 'admin' : 'member';
  
  if (!confirm(`Change this member's role to ${newRole}?`)) return;
  
  try {
    const group = groups.find(g => g.id === groupId);
    const updatedMembers = group.members.map(member => 
      member.userId === userId ? {...member, role: newRole} : member
    );
    
    await updateDoc(doc(db, 'Groups', groupId), {
      members: updatedMembers
    });
    
    // Update local data
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex !== -1) {
      groups[groupIndex].members = updatedMembers;
    }
    
    showSuccessMessage(`Member role updated to ${newRole}!`);
    
    // Refresh the modal
    document.body.removeChild(document.querySelector('.fixed'));
    showMemberManagement(groupId);
    
  } catch (error) {
    console.error('Error changing member role:', error);
    alert('Error changing member role. Please try again.');
  }
}

// Remove member from group
async function removeMember(groupId, userId, memberName) {
  if (!confirm(`Remove ${memberName} from the group?`)) return;
  
  try {
    const group = groups.find(g => g.id === groupId);
    const updatedMembers = group.members.filter(member => member.userId !== userId);
    
    await updateDoc(doc(db, 'Groups', groupId), {
      members: updatedMembers
    });
    
    // Update local data
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex !== -1) {
      groups[groupIndex].members = updatedMembers;
    }
    
    showSuccessMessage(`${memberName} removed from group!`);
    
    // Refresh the modal
    document.body.removeChild(document.querySelector('.fixed'));
    showMemberManagement(groupId);
    
  } catch (error) {
    console.error('Error removing member:', error);
    alert('Error removing member. Please try again.');
  }
}

// Delete group (owner only)
async function deleteGroup(groupId, groupName) {
  // Double confirmation for group deletion
  if (!confirm(`Are you sure you want to delete "${groupName}"?\n\nThis will permanently delete:\n• All todos and grocery items\n• All member data\n• Group settings and history\n\nThis action cannot be undone.`)) {
    return;
  }
  
  // Second confirmation
  if (!confirm(`Final confirmation: Delete "${groupName}" forever?`)) {
    return;
  }
  
  try {
    // Delete all todos in this group
    const todosQuery = query(collection(db, 'todos'), where('groupId', '==', groupId));
    const todosSnapshot = await getDocs(todosQuery);
    const todoDeletePromises = todosSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // Delete all grocery items in this group
    const groceryQuery = query(collection(db, 'groceryItems'), where('groupId', '==', groupId));
    const grocerySnapshot = await getDocs(groceryQuery);
    const groceryDeletePromises = grocerySnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // Delete all related data
    await Promise.all([...todoDeletePromises, ...groceryDeletePromises]);
    
    // Delete the group from Firestore
    await deleteDoc(doc(db, 'Groups', groupId));
    
    // Remove from local groups array
    groups = groups.filter(g => g.id !== groupId);
    
    // Close group details modal
    closeGroupDetails();
    
    // If this was the current group, switch to personal
    if (currentGroupId === groupId) {
      switchToGroup('personal');
    }
    
    // Refresh groups list
    renderGroupsList();
    
    alert('Group deleted successfully!');
    
  } catch (error) {
    console.error('Error deleting group:', error);
    alert('Error deleting group. Please try again.');
  }
}

// Promote member to co-owner (owner only)
async function promoteMember(groupId, userId, memberName) {
  if (!confirm(`Promote ${memberName} to co-owner? This will allow them to invite new members to the group.`)) return;
  
  try {
    const group = groups.find(g => g.id === groupId);
    const updatedMembers = group.members.map(member => 
      member.userId === userId ? {...member, role: 'co-owner'} : member
    );
    
    await updateDoc(doc(db, 'Groups', groupId), {
      members: updatedMembers
    });
    
    // Update local data
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex !== -1) {
      groups[groupIndex].members = updatedMembers;
    }
    
    showSuccessMessage(`${memberName} promoted to co-owner!`);
    
    // Refresh the group details
    renderGroupDetails();
    
  } catch (error) {
    console.error('Error promoting member:', error);
    alert('Error promoting member. Please try again.');
  }
}

// Demote co-owner to member (owner only)
async function demoteMember(groupId, userId, memberName) {
  if (!confirm(`Remove co-owner status from ${memberName}? They will become a regular member.`)) return;
  
  try {
    const group = groups.find(g => g.id === groupId);
    const updatedMembers = group.members.map(member => 
      member.userId === userId ? {...member, role: 'member'} : member
    );
    
    await updateDoc(doc(db, 'Groups', groupId), {
      members: updatedMembers
    });
    
    // Update local data
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex !== -1) {
      groups[groupIndex].members = updatedMembers;
    }
    
    showSuccessMessage(`${memberName} is now a regular member.`);
    
    // Refresh the group details
    renderGroupDetails();
    
  } catch (error) {
    console.error('Error demoting member:', error);
    alert('Error updating member role. Please try again.');
  }
}

// Copy invite code to clipboard
async function copyInviteCode(inviteCode) {
  try {
    await navigator.clipboard.writeText(inviteCode);
    showSuccessMessage('Invite code copied to clipboard!');
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = inviteCode;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showSuccessMessage('Invite code copied to clipboard!');
  }
}

// Show invite code modal for co-owners and owners
function showInviteCodeModal(group) {
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'inviteCodeModalOverlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
    max-height: 80%;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    transform: scale(0.9);
    transition: transform 0.3s ease;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  modal.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    ">
      <h2 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      ">Invite Members</h2>
      <button id="closeInviteModal" style="
        width: 32px;
        height: 32px;
        border: none;
        background: none;
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        cursor: pointer;
        font-size: 20px;
        border-radius: 8px;
        transition: all 0.2s;
      ">×</button>
    </div>
    
    <div style="
      background: ${isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(248, 250, 252, 0.8)'};
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      text-align: center;
    ">
      <div style="
        font-size: 48px;
        margin-bottom: 16px;
      ">${group.emoji}</div>
      <h3 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0 0 8px 0;
        font-size: 20px;
        font-weight: 600;
      ">${group.name}</h3>
      <p style="
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        margin: 0;
        font-size: 14px;
      ">Share this invite code with people you want to add to the group</p>
    </div>
    
    <div style="
      background: ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.5)'};
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      text-align: center;
    ">
      <label style="
        color: ${isDarkMode ? '#cbd5e1' : '#475569'};
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: block;
        margin-bottom: 8px;
      ">Group Invite Code</label>
      <div style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        font-family: monospace;
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 16px;
        padding: 12px;
        background: ${isDarkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.8)'};
        border-radius: 8px;
        border: 2px dashed ${isDarkMode ? '#475569' : '#cbd5e1'};
      ">${group.inviteCode}</div>
      <button onclick="copyInviteCode('${group.inviteCode}')" style="
        padding: 12px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
      ">📋 Copy Invite Code</button>
    </div>
    
    <div style="
      color: ${isDarkMode ? '#94a3b8' : '#64748b'};
      font-size: 14px;
      text-align: center;
      line-height: 1.5;
    ">
      <p style="margin: 0 0 8px 0;">📱 <strong>How to use:</strong></p>
      <p style="margin: 0;">Send this code to friends. They can join by clicking "Join Group" and entering this code.</p>
    </div>
  `;

  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);

  // Animation
  setTimeout(() => {
    modalOverlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  }, 10);

  function closeModal() {
    modalOverlay.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    setTimeout(() => {
      if (document.body.contains(modalOverlay)) {
        document.body.removeChild(modalOverlay);
      }
    }, 300);
  }

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  document.getElementById('closeInviteModal').addEventListener('click', closeModal);
}

// Password validation function
function validatePassword(password) {
  const hasNumber = /\d/.test(password);
  const hasMinLength = password.length >= 6;
  
  return {
    isValid: hasNumber && hasMinLength,
    hasNumber,
    hasMinLength,
    errors: []
  };
}

// Open edit profile modal
function openEditProfileModal() {
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'editProfileModalOverlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
    max-height: 80%;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
    transform: scale(0.9);
    transition: transform 0.3s ease;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  modal.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    ">
      <h2 style="
        color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
        margin: 0;
        font-size: 24px;
        font-weight: 700;
      ">Edit Profile</h2>
      <button id="closeEditProfileModal" style="
        width: 32px;
        height: 32px;
        border: none;
        background: none;
        color: ${isDarkMode ? '#94a3b8' : '#64748b'};
        cursor: pointer;
        font-size: 20px;
        border-radius: 8px;
        transition: all 0.2s;
      ">×</button>
    </div>
    
    <form id="editProfileForm">
      <div style="margin-bottom: 20px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">First Name</label>
        <input type="text" id="firstNameInput" placeholder="Enter your first name" style="
          width: 100%;
          height: 48px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 16px;
          background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
        ">
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">Last Name</label>
        <input type="text" id="lastNameInput" placeholder="Enter your last name" style="
          width: 100%;
          height: 48px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 16px;
          background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
        ">
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">Avatar</label>
        <div style="
          display: flex;
          align-items: center;
          gap: 16px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 16px;
          background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
        ">
          <div id="selectedEmoji" style="
            font-size: 48px;
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(0, 0, 0, 0.05)'};
            border-radius: 50%;
          ">👤</div>
          <button type="button" id="changeEmojiBtn" style="
            padding: 12px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          ">Change Emoji</button>
        </div>
      </div>
      
      <!-- Emoji Picker Modal -->
      <div id="emojiPickerModal" style="
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        justify-content: center;
        align-items: center;
      ">
        <div style="
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          backdrop-filter: blur(20px);
          border-radius: 16px;
          width: 320px;
          height: 400px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          flex-direction: column;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 16px 12px;
            border-bottom: 1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(0, 0, 0, 0.1)'};
            flex-shrink: 0;
          ">
            <h3 style="
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
              margin: 0;
              font-size: 16px;
              font-weight: 700;
            ">Choose Avatar</h3>
            <button id="closeEmojiPicker" style="
              width: 28px;
              height: 28px;
              border: none;
              background: none;
              color: ${isDarkMode ? '#94a3b8' : '#64748b'};
              cursor: pointer;
              font-size: 16px;
              border-radius: 6px;
              transition: all 0.2s;
            ">×</button>
          </div>
          <div style="
            flex: 1;
            overflow-y: auto;
            padding: 12px;
          ">
            <div style="
              display: grid;
              grid-template-columns: repeat(6, 1fr);
              gap: 6px;
              justify-items: center;
            " id="emojiGrid">
              ${(() => {
                // Define base emojis grouped by category
                const emojiCategories = {
                  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
                  people: ['👶', '🧒', '👦', '👧', '🧑', '👨', '👩', '🧓', '👴', '👵', '👱', '🧔', '👮', '👷', '💂', '🕵️', '👩‍⚕️', '👨‍⚕️', '👩‍🌾', '👨‍🌾', '👩‍🍳', '👨‍🍳', '👩‍🎓', '👨‍🎓', '👩‍🎤', '👨‍🎤', '👩‍🏫', '👨‍🏫', '👩‍🏭', '👨‍🏭', '👩‍💻', '👨‍💻', '👩‍💼', '👨‍💼', '👩‍🔧', '👨‍🔧', '👩‍🔬', '👨‍🔬', '👩‍🎨', '👨‍🎨', '👩‍🚒', '👨‍🚒', '👩‍✈️', '👨‍✈️', '👩‍🚀', '👨‍🚀', '👩‍⚖️', '👨‍⚖️', '🤴', '👸', '👳', '🧕', '🤵', '👰', '🤱', '🤰'],
                  gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🙏', '✍️', '💅', '🤳', '💪', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'],
                  activities: ['🏃', '🚶', '🧍', '🧎', '🏋️', '🤸', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻'],
                  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦍', '🦣', '🐘', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🦄', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦅', '🦆', '🦢', '🦉', '🦚', '🦜'],
                  objects: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️‍♂️', '🤼‍♀️', '🤼‍♂️', '🤸‍♀️', '🤸‍♂️', '⛹️‍♀️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾‍♂️', '🏌️‍♀️', '🏌️‍♂️', '🧘‍♀️', '🧘‍♂️', '🏄‍♀️', '🏄‍♂️']
                };

                // Generate emoji buttons with skin tone variants
                return Object.entries(emojiCategories).map(([category, emojis]) => {
                  return emojis.map(baseEmoji => {
                    // Check if emoji supports skin tones (contains person-related unicode)
                    const supportsSkinTones = /[\u{1F3C3}-\u{1F3CC}\u{1F44D}-\u{1F450}\u{1F466}-\u{1F469}\u{1F46E}-\u{1F478}\u{1F47C}\u{1F481}-\u{1F483}\u{1F485}-\u{1F487}\u{1F48F}\u{1F491}\u{1F4AA}\u{1F574}\u{1F575}\u{1F57A}\u{1F590}\u{1F595}-\u{1F596}\u{1F64C}-\u{1F64F}\u{1F6A3}\u{1F6B4}-\u{1F6B6}\u{1F6C0}\u{1F6CC}\u{1F90C}-\u{1F90F}\u{1F918}-\u{1F91F}\u{1F926}\u{1F930}-\u{1F939}\u{1F93C}-\u{1F93E}]/u.test(baseEmoji);
                    
                    const variants = supportsSkinTones 
                      ? [baseEmoji + '🏻', baseEmoji + '🏼', baseEmoji + '🏽', baseEmoji + '🏾', baseEmoji + '🏿']
                      : [];

                    return `<button type="button" class="emoji-btn" data-emoji="${baseEmoji}" data-variants='${JSON.stringify(variants)}' style="
                      width: 42px;
                      height: 42px;
                      border: none;
                      background: ${isDarkMode ? 'rgba(71, 85, 105, 0.2)' : 'rgba(0, 0, 0, 0.05)'};
                      font-size: 22px;
                      cursor: pointer;
                      border-radius: 8px;
                      transition: all 0.2s;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      position: relative;
                      flex-shrink: 0;
                    " onmouseover="this.style.background='${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='${isDarkMode ? 'rgba(71, 85, 105, 0.2)' : 'rgba(0, 0, 0, 0.05)'}'; this.style.transform='scale(1)'">${baseEmoji}${variants.length > 0 ? '<div style="position: absolute; bottom: 1px; right: 1px; width: 5px; height: 5px; background: ' + (isDarkMode ? '#10b981' : '#059669') + '; border-radius: 50%; border: 1px solid ' + (isDarkMode ? '#1e293b' : '#ffffff') + ';"></div>' : ''}</button>`;
                  }).join('');
                }).join('');
              })()}
            </div>
          </div>
        </div>
      </div>

      <!-- Emoji Variant Picker Modal -->
      <div id="emojiVariantModal" style="
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        justify-content: center;
        align-items: center;
      ">
        <div style="
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 24px;
          max-width: 350px;
          width: 90%;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          ">
            <h3 style="
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
              margin: 0;
              font-size: 18px;
              font-weight: 700;
            ">Choose Skin Tone</h3>
            <button id="closeVariantPicker" style="
              width: 32px;
              height: 32px;
              border: none;
              background: none;
              color: ${isDarkMode ? '#94a3b8' : '#64748b'};
              cursor: pointer;
              font-size: 18px;
              border-radius: 8px;
              transition: all 0.2s;
            ">×</button>
          </div>
          <div style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          " id="variantGrid">
            <!-- Variants will be populated here -->
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">New Password (optional)</label>
        <input type="password" id="newPasswordInput" placeholder="Enter new password" style="
          width: 100%;
          height: 48px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 16px;
          background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
        ">
        <div id="passwordRequirements" style="
          margin-top: 8px;
          font-size: 12px;
          color: ${isDarkMode ? '#94a3b8' : '#64748b'};
          display: none;
        ">
          <div id="lengthReq">• At least 6 characters</div>
          <div id="numberReq">• At least 1 number</div>
        </div>
      </div>
      
      <div style="margin-bottom: 24px;">
        <label style="
          display: block;
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
        ">Confirm New Password</label>
        <input type="password" id="confirmPasswordInput" placeholder="Confirm new password" style="
          width: 100%;
          height: 48px;
          border: 2px solid ${isDarkMode ? '#475569' : '#e2e8f0'};
          border-radius: 12px;
          padding: 0 16px;
          background-color: ${isDarkMode ? '#1e293b' : '#f8fafc'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          font-size: 16px;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
        ">
        <div id="passwordMatchError" style="
          margin-top: 8px;
          font-size: 12px;
          color: #ef4444;
          display: none;
        ">Passwords do not match</div>
      </div>
      
      <div style="display: flex; gap: 12px;">
        <button type="button" id="cancelEditProfile" style="
          flex: 1;
          padding: 12px 24px;
          background: ${isDarkMode ? '#404040' : '#f1f5f9'};
          color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">Cancel</button>
        <button type="submit" id="saveProfile" style="
          flex: 1;
          padding: 12px 24px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">Save Changes</button>
      </div>
    </form>
  `;

  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);

  // Animation
  setTimeout(() => {
    modalOverlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  }, 10);

  // Load current user data
  loadCurrentProfileData();

  // Setup event listeners
  setupEditProfileListeners();

  function closeModal() {
    modalOverlay.style.opacity = '0';
    modal.style.transform = 'scale(0.9)';
    setTimeout(() => {
      if (document.body.contains(modalOverlay)) {
        document.body.removeChild(modalOverlay);
      }
    }, 300);
  }

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  document.getElementById('closeEditProfileModal').addEventListener('click', closeModal);
  document.getElementById('cancelEditProfile').addEventListener('click', closeModal);
}

// Load current profile data into edit form
async function loadCurrentProfileData() {
  if (!currentUser) return;
  
  try {
    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Populate form fields
      const firstNameInput = document.getElementById('firstNameInput');
      const lastNameInput = document.getElementById('lastNameInput');
      
      if (firstNameInput) firstNameInput.value = userData.firstName || '';
      if (lastNameInput) lastNameInput.value = userData.lastName || '';
      
      // Load saved emoji
      const selectedEmojiElement = document.getElementById('selectedEmoji');
      if (selectedEmojiElement) {
        const savedEmoji = userData.avatarEmoji || '👤';
        selectedEmojiElement.textContent = savedEmoji;
      }
    }
  } catch (error) {
    console.error('Error loading profile data:', error);
  }
}

// Setup edit profile form listeners
function setupEditProfileListeners() {
  const newPasswordInput = document.getElementById('newPasswordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const passwordRequirements = document.getElementById('passwordRequirements');
  const passwordMatchError = document.getElementById('passwordMatchError');
  const editProfileForm = document.getElementById('editProfileForm');

  // Show password requirements when typing
  if (newPasswordInput) {
    newPasswordInput.addEventListener('input', (e) => {
      const password = e.target.value;
      
      if (password.length > 0) {
        passwordRequirements.style.display = 'block';
        
        const validation = validatePassword(password);
        const lengthReq = document.getElementById('lengthReq');
        const numberReq = document.getElementById('numberReq');
        
        lengthReq.style.color = validation.hasMinLength ? '#10b981' : '#ef4444';
        numberReq.style.color = validation.hasNumber ? '#10b981' : '#ef4444';
      } else {
        passwordRequirements.style.display = 'none';
      }
      
      // Check password match
      checkPasswordMatch();
    });
  }

  // Check password match
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);
  }

  function checkPasswordMatch() {
    const password = newPasswordInput?.value || '';
    const confirmPassword = confirmPasswordInput?.value || '';
    
    if (confirmPassword.length > 0 && password !== confirmPassword) {
      passwordMatchError.style.display = 'block';
    } else {
      passwordMatchError.style.display = 'none';
    }
  }

  // Handle change emoji button click
  const changeEmojiBtn = document.getElementById('changeEmojiBtn');
  const emojiPickerModal = document.getElementById('emojiPickerModal');
  const emojiVariantModal = document.getElementById('emojiVariantModal');
  const closeEmojiPicker = document.getElementById('closeEmojiPicker');
  const closeVariantPicker = document.getElementById('closeVariantPicker');
  
  if (changeEmojiBtn && emojiPickerModal) {
    changeEmojiBtn.addEventListener('click', () => {
      emojiPickerModal.style.display = 'flex';
    });
  }
  
  if (closeEmojiPicker && emojiPickerModal) {
    closeEmojiPicker.addEventListener('click', () => {
      emojiPickerModal.style.display = 'none';
    });
  }
  
  if (closeVariantPicker && emojiVariantModal) {
    closeVariantPicker.addEventListener('click', () => {
      emojiVariantModal.style.display = 'none';
    });
  }
  
  // Close modal when clicking outside
  if (emojiPickerModal) {
    emojiPickerModal.addEventListener('click', (e) => {
      if (e.target === emojiPickerModal) {
        emojiPickerModal.style.display = 'none';
      }
    });
  }
  
  if (emojiVariantModal) {
    emojiVariantModal.addEventListener('click', (e) => {
      if (e.target === emojiVariantModal) {
        emojiVariantModal.style.display = 'none';
      }
    });
  }

  // Handle emoji selection
  document.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget;
      const baseEmoji = button.dataset.emoji;
      const variants = button.dataset.variants;
      
      if (variants && variants !== '[]') {
        // Show variant picker
        const variantData = JSON.parse(variants);
        const variantGrid = document.getElementById('variantGrid');
        
        if (variantGrid) {
          // Include base emoji + all variants
          const allOptions = [baseEmoji, ...variantData];
          
          variantGrid.innerHTML = allOptions.map(emoji => `
            <button type="button" class="variant-btn" data-emoji="${emoji}" style="
              width: 64px;
              height: 64px;
              border: none;
              background: ${isDarkMode ? 'rgba(71, 85, 105, 0.2)' : 'rgba(0, 0, 0, 0.05)'};
              font-size: 36px;
              cursor: pointer;
              border-radius: 16px;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              justify-content: center;
            " onmouseover="this.style.background='${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='${isDarkMode ? 'rgba(71, 85, 105, 0.2)' : 'rgba(0, 0, 0, 0.05)'}'; this.style.transform='scale(1)'">${emoji}</button>
          `).join('');
          
          // Add event listeners to variant buttons
          document.querySelectorAll('.variant-btn').forEach(variantBtn => {
            variantBtn.addEventListener('click', (e) => {
              const selectedEmoji = e.currentTarget.dataset.emoji;
              const emojiDisplay = document.getElementById('selectedEmoji');
              if (emojiDisplay) {
                emojiDisplay.textContent = selectedEmoji;
              }
              
              // Close both modals
              emojiPickerModal.style.display = 'none';
              emojiVariantModal.style.display = 'none';
            });
          });
          
          // Show variant picker
          emojiVariantModal.style.display = 'flex';
        }
      } else {
        // No variants, select directly
        const emojiDisplay = document.getElementById('selectedEmoji');
        if (emojiDisplay) {
          emojiDisplay.textContent = baseEmoji;
        }
        
        // Close the picker modal
        emojiPickerModal.style.display = 'none';
      }
    });
  });

  // Handle form submission
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', saveProfileChanges);
  }
}

// Save profile changes
async function saveProfileChanges(e) {
  e.preventDefault();
  
  if (!currentUser) {
    alert('User not authenticated');
    return;
  }

  const firstNameInput = document.getElementById('firstNameInput');
  const lastNameInput = document.getElementById('lastNameInput');
  const newPasswordInput = document.getElementById('newPasswordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  
  const firstName = firstNameInput?.value.trim() || '';
  const lastName = lastNameInput?.value.trim() || '';
  const newPassword = newPasswordInput?.value || '';
  const confirmPassword = confirmPasswordInput?.value || '';
  const selectedEmojiElement = document.getElementById('selectedEmoji');
  const avatarEmoji = selectedEmojiElement?.textContent || '👤';

  // Validate password if provided
  if (newPassword) {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      alert('Password must be at least 6 characters long and contain at least 1 number.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
  }

  try {
    // Update user profile in Firestore
    await setDoc(doc(db, 'users', currentUser.uid), {
      firstName,
      lastName,
      avatarEmoji,
      email: currentUser.email,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Update password if provided
    if (newPassword) {
      await updatePassword(currentUser, newPassword);
    }

    showSuccessMessage('Profile updated successfully!');
    
    // Close modal
    document.body.removeChild(document.getElementById('editProfileModalOverlay'));
    
    // Refresh profile view to show updated name
    loadTabContent('profile');
    
  } catch (error) {
    console.error('Error updating profile:', error);
    
    if (error.code === 'auth/requires-recent-login') {
      alert('Please log out and log back in to change your password.');
    } else {
      alert('Error updating profile: ' + error.message);
    }
  }
}

// Make functions available globally
window.closeGroupSwitcher = closeGroupSwitcher;
window.selectGroup = selectGroup;
window.showInviteCode = showInviteCode;
window.showMemberManagement = showMemberManagement;
window.changeMemberRole = changeMemberRole;
window.removeMember = removeMember;
window.promoteMember = promoteMember;
window.demoteMember = demoteMember;
window.copyInviteCode = copyInviteCode;
window.showInviteCodeModal = showInviteCodeModal;
window.openEditProfileModal = openEditProfileModal;



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
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
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
      <!-- Loading Screen -->
      <div id="loadingScreen" style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      ">
        <div style="
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          "></div>
        </div>
      </div>

      <!-- Login Screen -->
      <div id="loginScreen" style="
        display: none;
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
        // Reset to original tab styles (let CSS handle the theming)
        t.style.background = '';
        t.style.color = '';
        t.style.boxShadow = '';
      });
      
      e.target.classList.add('active');
      // Let CSS theme handle active tab styling
      applyGroupTheme(); // Reapply theme to ensure active tab gets group colors
      
      loadTabContent(tabId);
    });
  });
  
  // Version indicator click handler
  const versionIndicator = document.getElementById('versionIndicator');
  if (versionIndicator) {
    versionIndicator.addEventListener('click', () => {
      const currentVersion = versionIndicator.textContent;
      const newVersion = prompt('Enter version info (e.g., "v1.0.1 - Testing drag drop"):', currentVersion);
      if (newVersion !== null) {
        versionIndicator.textContent = newVersion;
        localStorage.setItem('appVersion', newVersion);
      }
    });
    
    // Load saved version from localStorage
    const savedVersion = localStorage.getItem('appVersion');
    if (savedVersion) {
      versionIndicator.textContent = savedVersion;
    }
  }
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

function showLoadingScreen() {
  document.getElementById('loadingScreen').style.display = 'flex';
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'none';
}

function showMainScreen() {
  document.getElementById('loadingScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'block';
  updateThemeStyles();
  setupNavigationListeners();
  
  // Set initial active tab
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const todosTab = document.querySelector('.nav-tab[data-tab="todos"]');
  if (todosTab) todosTab.classList.add('active');
  
  loadTabContent('todos');
  
  // Apply theme after DOM is ready
  setTimeout(() => {
    applyGroupTheme(); // Ensure group theme is applied to tabs
  }, 0);
}

function showLoginScreen() {
  document.getElementById('loadingScreen').style.display = 'none';
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
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

          ${getCurrentGroup().id !== 'personal' ? `
            <div style="margin-bottom: 20px;">
              <label style="
                display: flex;
                align-items: center;
                color: ${textColor};
                font-size: 14px;
                font-weight: 600;
                gap: 12px;
                cursor: pointer;
              ">
                <input type="checkbox" id="privacyToggle" style="
                  width: 18px;
                  height: 18px;
                  cursor: pointer;
                  accent-color: #667eea;
                ">
                <span>🔒 Make this todo private (only visible to you)</span>
              </label>
              <div style="
                font-size: 12px;
                color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                margin-top: 8px;
                margin-left: 30px;
              ">Private todos are only visible to you, even in shared groups</div>
            </div>
          ` : ''}

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
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
          ">Welcome, ${firstName || currentUser?.email || 'User'}!</h3>
          <p style="
            color: ${isDarkMode ? '#94a3b8' : '#64748b'};
            margin: 0;
            font-size: 16px;
          ">Shared with your partner</p>
        </div>
        
        <!-- Active Group Display -->
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
            ">Active Group</h4>
            <p style="
              color: ${isDarkMode ? '#94a3b8' : '#64748b'};
              margin: 0;
              font-size: 14px;
            ">${getGroupDisplayName(getCurrentGroup())}</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="groupDetailsBtn" style="
              padding: 8px 16px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            ">👥 Details</button>
            <button id="switchGroupBtn" style="
              padding: 8px 16px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            ">Switch Group</button>
          </div>
        </div>
        
        <!-- Group Switcher Modal -->
        <div id="groupSwitcherModal" style="
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
            max-width: 400px;
            max-height: 70vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
          ">
            <h3 style="
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
              margin: 0 0 24px 0;
              font-size: 24px;
              font-weight: 700;
              text-align: center;
            ">Switch Group</h3>
            
            <div id="groupsList" style="
              display: flex;
              flex-direction: column;
              gap: 12px;
              margin-bottom: 24px;
            "></div>
            
            <div style="
              display: flex;
              gap: 12px;
              justify-content: center;
            ">
              <button id="createGroupBtn" style="
                flex: 1;
                padding: 12px 16px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              ">+ Create Group</button>
              
              <button id="joinGroupBtn" style="
                flex: 1;
                padding: 12px 16px;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              ">📧 Join Group</button>
            </div>
            
            <button onclick="closeGroupSwitcher()" style="
              width: 100%;
              padding: 12px;
              background: ${isDarkMode ? '#404040' : '#f1f5f9'};
              color: ${isDarkMode ? '#e2e8f0' : '#1a202c'};
              border: none;
              border-radius: 12px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              margin-top: 12px;
            ">Cancel</button>
          </div>
        </div>
        
        <!-- Edit Profile Section -->
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
            ">Profile Settings</h4>
            <p style="
              color: ${isDarkMode ? '#94a3b8' : '#64748b'};
              margin: 0;
              font-size: 14px;
            ">Update your personal information</p>
          </div>
          <button id="editProfileBtn" style="
            padding: 8px 16px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
          ">✏️ Edit Profile</button>
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
        
        <!-- Version Indicator -->
        <div id="versionIndicator" style="
          margin-top: 24px;
          padding: 16px;
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(248, 250, 252, 0.8)'};
          border-radius: 12px;
          border: 1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.5)'};
          text-align: center;
        ">
          <div style="
            color: ${isDarkMode ? '#94a3b8' : '#64748b'};
            font-size: 12px;
            font-family: monospace;
            cursor: pointer;
            user-select: none;
          " title="Click to toggle version info">
            v1.0.0 - Latest
          </div>
        </div>
      </div>
      
      <!-- Group Details Modal -->
      <div id="groupDetailsModal" style="
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
        <div id="groupDetailsContent" style="
          background: ${isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 32px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        ">
          <!-- Content will be dynamically inserted here by renderGroupDetails() -->
        </div>
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
    
    // Setup group switching event listeners
    document.getElementById('switchGroupBtn').addEventListener('click', openGroupSwitcher);
    document.getElementById('groupDetailsBtn').addEventListener('click', openGroupDetails);
    document.getElementById('createGroupBtn').addEventListener('click', openCreateGroupModal);
    document.getElementById('joinGroupBtn').addEventListener('click', openJoinGroupModal);
    
    // Setup edit profile event listener
    document.getElementById('editProfileBtn').addEventListener('click', openEditProfileModal);
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
      const currentGroup = getCurrentGroup();
      const isPrivate = document.getElementById('privacyToggle')?.checked || false;
      
      // Calculate order for new todo (add at the end)
      const currentTodos = getFilteredTodos();
      const maxOrder = currentTodos.length > 0 ? Math.max(...currentTodos.map(t => t.order || 0)) : 0;
      
      const todoData = {
        text: text,
        completed: false,
        userId: currentUser.uid,
        groupId: currentGroupId === 'personal' ? null : currentGroupId,
        isPrivate: isPrivate && currentGroupId !== 'personal', // Only allow private items in groups
        category: category,
        priority: priority,
        order: maxOrder + 1000, // Add at the end with spacing
        createdAt: serverTimestamp()
      };
      
      if (dueDate) {
        todoData.dueDate = new Date(dueDate);
      }
      
      console.log('Saving todo with data:', todoData);
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
          const currentGroup = getCurrentGroup();
          await addDoc(collection(db, 'tags'), {
            name: tagName,
            color: selectedColor,
            userId: currentUser.uid,
            groupId: currentGroupId === 'personal' ? null : currentGroupId,
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
      datetime: datetime,
      updatedAt: serverTimestamp()
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

// Real-time drag and drop with live preview

window.handleTodoDragStart = (event, todoId, originalIndex) => {
  draggedTodoId = todoId;
  window.draggedTodoId = todoId;
  draggedIndex = originalIndex;
  currentPreviewIndex = originalIndex;
  draggedElement = event.target.closest('.todo-item');
  todoItems = Array.from(document.querySelectorAll('.todo-item'));
  
  event.dataTransfer.effectAllowed = 'move';
  
  // Make the dragged item invisible/picked up
  draggedElement.style.opacity = '0';
  draggedElement.style.transform = 'scale(0.8)';
  draggedElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  
  // Create a clone of the actual item for drag image
  const dragImage = draggedElement.cloneNode(true);
  dragImage.style.cssText = `
    position: absolute;
    top: -1000px;
    left: -1000px;
    width: ${draggedElement.offsetWidth}px;
    opacity: 0.95;
    transform: scale(0.98) rotate(1deg);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    z-index: 1000;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  document.body.appendChild(dragImage);
  
  event.dataTransfer.setDragImage(dragImage, event.offsetX, event.offsetY);
  
  // Clean up ghost image
  setTimeout(() => {
    if (document.body.contains(dragImage)) {
      document.body.removeChild(dragImage);
    }
  }, 0);
  
  // Make the dragged item semi-transparent but keep its space
  draggedElement.classList.add('dragging');
  // Don't modify inline styles - let CSS handle the appearance
  
  // Show the bottom drop zone during drag
  const bottomDropZone = document.querySelector('.bottom-drop-zone');
  if (bottomDropZone) {
    bottomDropZone.style.opacity = '0.1';
  }
};

window.handleTodoItemDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  if (!draggedTodoId) return;
  
  const targetElement = event.currentTarget;
  const targetIndex = parseInt(targetElement.getAttribute('data-original-index'));
  
  // Don't do anything if hovering over the same item or if it's the dragged item
  if (targetIndex === currentPreviewIndex || targetElement === draggedElement) return;
  
  // Super fast and sensitive detection
  const rect = targetElement.getBoundingClientRect();
  const mouseY = event.clientY - rect.top;
  const elementHeight = rect.height;
  
  // Much more sensitive - use 35% threshold for instant reactions
  const threshold = elementHeight * 0.35;
  const isUpperSection = mouseY < threshold;
  const isLowerSection = mouseY > (elementHeight - threshold);
  
  let newPreviewIndex;
  if (isUpperSection) {
    newPreviewIndex = targetIndex;
  } else if (isLowerSection) {
    newPreviewIndex = targetIndex + 1;
  } else {
    // Even in middle section, be more responsive
    newPreviewIndex = mouseY < elementHeight / 2 ? targetIndex : targetIndex + 1;
  }
  
  // Only update if the preview position changed
  if (newPreviewIndex !== currentPreviewIndex) {
    updatePreviewOrder(newPreviewIndex);
    currentPreviewIndex = newPreviewIndex;
  }
};

window.handleTodoItemDragLeave = (event) => {
  // Don't reset anything - let the preview stay until we hover over another item
};

window.handleBottomDropZoneDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  if (!draggedTodoId) return;
  
  const dropZone = event.currentTarget;
  dropZone.style.opacity = '0.6';
  dropZone.style.border = '1px solid #667eea';
  dropZone.style.background = 'rgba(102, 126, 234, 0.05)';
  
  // Show preview of moving to bottom
  const totalItems = document.querySelectorAll('.todo-item').length;
  updatePreviewOrder(totalItems);
  currentPreviewIndex = totalItems;
};

window.handleBottomDropZoneDragLeave = (event) => {
  const dropZone = event.currentTarget;
  dropZone.style.opacity = '0.2';
  dropZone.style.border = '1px solid transparent';
  dropZone.style.background = 'transparent';
};

window.handleBottomDropZoneDrop = async (event) => {
  event.preventDefault();
  
  if (draggedTodoId) {
    const totalItems = document.querySelectorAll('.todo-item').length;
    await saveNewTodoOrder(totalItems);
  }
};

window.handleTodoDragEnd = (event) => {
  if (!draggedTodoId) return;
  
  // If position changed, save the new order
  if (currentPreviewIndex !== draggedIndex) {
    saveNewTodoOrder(currentPreviewIndex);
  } else {
    // Reset to original positions if no change
    resetPreviewOrder();
  }
  
  // Restore the dragged item visibility
  if (draggedElement) {
    draggedElement.style.opacity = '1';
    draggedElement.style.transform = 'scale(1)';
    draggedElement.classList.remove('dragging');
  }
  
  // Hide the bottom drop zone
  const bottomDropZone = document.querySelector('.bottom-drop-zone');
  if (bottomDropZone) {
    bottomDropZone.style.opacity = '0';
    bottomDropZone.style.border = '1px solid transparent';
    bottomDropZone.style.background = 'transparent';
  }
  
  draggedTodoId = null;
  window.draggedTodoId = null;
  draggedElement = null;
  draggedIndex = null;
  currentPreviewIndex = null;
  todoItems = [];
};

function updatePreviewOrder(newIndex) {
  const items = Array.from(document.querySelectorAll('.todo-item'));
  const draggedItem = items.find(item => item.getAttribute('data-todo-id') === draggedTodoId);
  
  if (!draggedItem) return;
  
  // Calculate the height of one item (including margin)
  const itemHeight = draggedItem.offsetHeight + 8; // 8px margin-bottom
  
  // Reset all transforms and apply linear movement
  items.forEach((item) => {
    if (item === draggedItem) return;
    
    const originalIndex = parseInt(item.getAttribute('data-original-index'));
    let offset = 0;
    
    // Simplified linear logic for cleaner movement
    if (draggedIndex < newIndex) {
      // Moving item down: shift items up linearly
      if (originalIndex > draggedIndex && originalIndex < newIndex) {
        offset = -itemHeight;
      }
    } else if (draggedIndex > newIndex) {
      // Moving item up: shift items down linearly
      if (originalIndex >= newIndex && originalIndex < draggedIndex) {
        offset = itemHeight;
      }
    }
    
    // Apply fast, responsive transformation
    item.style.transform = `translateY(${offset}px)`;
    item.style.transition = 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)';
    
    // Add subtle visual feedback for items that are moving
    if (offset !== 0) {
      item.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.12)';
    } else {
      item.style.boxShadow = '';
    }
  });
}

function resetPreviewOrder() {
  document.querySelectorAll('.todo-item').forEach(item => {
    if (item !== draggedElement) {
      item.style.transform = 'translateY(0px)';
      item.style.transition = 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)';
      item.style.boxShadow = '';
    }
  });
}

async function saveNewTodoOrder(newIndex) {
  try {
    const currentTodos = getFilteredTodos();
    const draggedTodo = currentTodos[draggedIndex];
    if (!draggedTodo) return;
    
    // Calculate new order based on position
    let newOrder;
    const SPACING = 1000;
    
    if (newIndex === 0) {
      // Moving to the beginning
      const firstTodo = currentTodos[0];
      newOrder = firstTodo ? (firstTodo.order || 0) - SPACING : SPACING;
    } else if (newIndex >= currentTodos.length) {
      // Moving to the end
      const lastTodo = currentTodos[currentTodos.length - 1];
      newOrder = (lastTodo.order || 0) + SPACING;
    } else {
      // Moving between items
      let beforeIndex, afterIndex;
      
      if (draggedIndex < newIndex) {
        // Moving down
        beforeIndex = newIndex - 1;
        afterIndex = newIndex;
      } else {
        // Moving up
        beforeIndex = newIndex - 1;
        afterIndex = newIndex;
      }
      
      const beforeTodo = beforeIndex >= 0 ? currentTodos[beforeIndex] : null;
      const afterTodo = afterIndex < currentTodos.length ? currentTodos[afterIndex] : null;
      
      const beforeOrder = beforeTodo ? (beforeTodo.order || 0) : 0;
      const afterOrder = afterTodo ? (afterTodo.order || 0) : (beforeOrder + SPACING);
      
      const gap = afterOrder - beforeOrder;
      if (gap <= 1) {
        await rebalanceTodoOrders();
        return saveNewTodoOrder(newIndex);
      }
      
      newOrder = beforeOrder + (gap / 2);
    }
    
    // Update in Firestore
    const todoRef = doc(db, 'todos', draggedTodoId);
    await updateDoc(todoRef, { order: newOrder });
    
    // Update local state
    const todoIndex = todos.findIndex(t => t.id === draggedTodoId);
    if (todoIndex !== -1) {
      todos[todoIndex].order = newOrder;
    }
    
    // Re-render
    renderTodos();
  } catch (error) {
    console.error('Error saving new order:', error);
    resetPreviewOrder();
  }
}

async function reorderTodosToPosition(draggedId, targetPosition) {
  try {
    const currentTodos = getFilteredTodos();
    const draggedTodo = currentTodos.find(t => t.id === draggedId);
    if (!draggedTodo) return;
    
    // Calculate new order based on position
    let newOrder;
    const SPACING = 1000;
    
    if (targetPosition === 0) {
      // Moving to the beginning
      const firstTodo = currentTodos[0];
      newOrder = firstTodo ? (firstTodo.order || 0) - SPACING : SPACING;
    } else if (targetPosition >= currentTodos.length) {
      // Moving to the end
      const lastTodo = currentTodos[currentTodos.length - 1];
      newOrder = (lastTodo.order || 0) + SPACING;
    } else {
      // Moving between items
      const beforeTodo = currentTodos[targetPosition - 1];
      const afterTodo = currentTodos[targetPosition];
      
      const beforeOrder = beforeTodo ? (beforeTodo.order || 0) : 0;
      const afterOrder = afterTodo ? (afterTodo.order || 0) : SPACING;
      
      // Calculate midpoint
      const gap = afterOrder - beforeOrder;
      if (gap <= 1) {
        // If gap is too small, rebalance the entire list
        await rebalanceTodoOrders();
        return reorderTodosToPosition(draggedId, targetPosition); // Retry after rebalancing
      }
      
      newOrder = beforeOrder + (gap / 2);
    }
    
    // Update the order in Firestore
    const currentGroup = getCurrentGroup();
    const todoRef = doc(db, 'todos', draggedId);
    await updateDoc(todoRef, {
      order: newOrder
    });
    
    // Update local state
    const todoIndex = todos.findIndex(t => t.id === draggedId);
    if (todoIndex !== -1) {
      todos[todoIndex].order = newOrder;
    }
    
    // Re-render the todos
    renderTodos();
  } catch (error) {
    console.error('Error reordering todos:', error);
  }
}

// Grocery drag and drop functionality (same as todos)

window.handleGroceryDragStart = (event, groceryId, originalIndex) => {
  draggedGroceryId = groceryId;
  window.draggedGroceryId = groceryId;
  draggedGroceryIndex = originalIndex;
  currentGroceryPreviewIndex = originalIndex;
  draggedGroceryElement = event.target.closest('.grocery-item');
  groceryItems = Array.from(document.querySelectorAll('.grocery-item'));
  
  event.dataTransfer.effectAllowed = 'move';
  
  // Make the dragged item invisible/picked up
  draggedGroceryElement.style.opacity = '0';
  draggedGroceryElement.style.transform = 'scale(0.8)';
  draggedGroceryElement.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  
  // Create a clone of the actual item for drag image
  const dragImage = draggedGroceryElement.cloneNode(true);
  dragImage.style.cssText = `
    position: absolute;
    top: -1000px;
    left: -1000px;
    width: ${draggedGroceryElement.offsetWidth}px;
    opacity: 0.95;
    transform: scale(0.98) rotate(1deg);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    pointer-events: none;
    z-index: 1000;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  document.body.appendChild(dragImage);
  
  event.dataTransfer.setDragImage(dragImage, event.offsetX, event.offsetY);
  
  // Clean up ghost image
  setTimeout(() => {
    if (document.body.contains(dragImage)) {
      document.body.removeChild(dragImage);
    }
  }, 0);
  
  // Make the dragged item semi-transparent but keep its space
  draggedGroceryElement.classList.add('dragging');
  // Don't modify inline styles - let CSS handle the appearance
  
  // Show the bottom drop zone during drag
  const bottomDropZone = document.querySelector('.bottom-drop-zone-grocery');
  if (bottomDropZone) {
    bottomDropZone.style.opacity = '0.1';
  }
};

window.handleGroceryItemDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  if (!draggedGroceryId) return;
  
  const targetElement = event.currentTarget;
  const targetIndex = parseInt(targetElement.getAttribute('data-original-index'));
  
  // Don't do anything if hovering over the same item or if it's the dragged item
  if (targetIndex === currentGroceryPreviewIndex || targetElement === draggedGroceryElement) return;
  
  // Super fast and sensitive detection
  const rect = targetElement.getBoundingClientRect();
  const mouseY = event.clientY - rect.top;
  const elementHeight = rect.height;
  
  // Much more sensitive - use 35% threshold for instant reactions
  const threshold = elementHeight * 0.35;
  const isUpperSection = mouseY < threshold;
  const isLowerSection = mouseY > (elementHeight - threshold);
  
  let newPreviewIndex;
  if (isUpperSection) {
    newPreviewIndex = targetIndex;
  } else if (isLowerSection) {
    newPreviewIndex = targetIndex + 1;
  } else {
    // Even in middle section, be more responsive
    newPreviewIndex = mouseY < elementHeight / 2 ? targetIndex : targetIndex + 1;
  }
  
  // Only update if the preview position changed
  if (newPreviewIndex !== currentGroceryPreviewIndex) {
    updateGroceryPreviewOrder(newPreviewIndex);
    currentGroceryPreviewIndex = newPreviewIndex;
  }
};

window.handleGroceryItemDragLeave = (event) => {
  // Don't reset anything - let the preview stay until we hover over another item
};

window.handleBottomDropZoneGroceryDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  
  if (!draggedGroceryId) return;
  
  const dropZone = event.currentTarget;
  dropZone.style.opacity = '0.6';
  dropZone.style.border = '1px solid #667eea';
  dropZone.style.background = 'rgba(102, 126, 234, 0.05)';
  
  // Show preview of moving to bottom
  const totalItems = document.querySelectorAll('.grocery-item').length;
  updateGroceryPreviewOrder(totalItems);
  currentGroceryPreviewIndex = totalItems;
};

window.handleBottomDropZoneGroceryDragLeave = (event) => {
  const dropZone = event.currentTarget;
  dropZone.style.opacity = '0.2';
  dropZone.style.border = '1px solid transparent';
  dropZone.style.background = 'transparent';
};

window.handleBottomDropZoneGroceryDrop = async (event) => {
  event.preventDefault();
  
  if (draggedGroceryId) {
    const totalItems = document.querySelectorAll('.grocery-item').length;
    await saveNewGroceryOrder(totalItems);
  }
};

window.handleGroceryDragEnd = (event) => {
  if (!draggedGroceryId) return;
  
  // If position changed, save the new order
  if (currentGroceryPreviewIndex !== draggedGroceryIndex) {
    saveNewGroceryOrder(currentGroceryPreviewIndex);
  } else {
    // Reset to original positions if no change
    resetGroceryPreviewOrder();
  }
  
  // Restore the dragged item visibility
  if (draggedGroceryElement) {
    draggedGroceryElement.style.opacity = '1';
    draggedGroceryElement.style.transform = 'scale(1)';
    draggedGroceryElement.classList.remove('dragging');
    // Don't modify inline styles - let CSS handle the appearance
  }
  
  // Hide the bottom drop zone
  const bottomDropZone = document.querySelector('.bottom-drop-zone-grocery');
  if (bottomDropZone) {
    bottomDropZone.style.opacity = '0';
    bottomDropZone.style.border = '1px solid transparent';
    bottomDropZone.style.background = 'transparent';
  }
  
  draggedGroceryId = null;
  window.draggedGroceryId = null;
  draggedGroceryElement = null;
  draggedGroceryIndex = null;
  currentGroceryPreviewIndex = null;
  groceryItems = [];
};

function updateGroceryPreviewOrder(newIndex) {
  const items = Array.from(document.querySelectorAll('.grocery-item'));
  const draggedItem = items.find(item => item.getAttribute('data-grocery-id') === draggedGroceryId);
  
  if (!draggedItem) return;
  
  // Calculate the height of one item (including margin)
  const itemHeight = draggedItem.offsetHeight + 8; // 8px margin-bottom
  
  // Reset all transforms and apply linear movement
  items.forEach((item) => {
    if (item === draggedItem) return;
    
    const originalIndex = parseInt(item.getAttribute('data-original-index'));
    let offset = 0;
    
    // Simplified linear logic for cleaner movement
    if (draggedGroceryIndex < newIndex) {
      // Moving item down: shift items up linearly
      if (originalIndex > draggedGroceryIndex && originalIndex < newIndex) {
        offset = -itemHeight;
      }
    } else if (draggedGroceryIndex > newIndex) {
      // Moving item up: shift items down linearly
      if (originalIndex >= newIndex && originalIndex < draggedGroceryIndex) {
        offset = itemHeight;
      }
    }
    
    // Apply fast, responsive transformation
    item.style.transform = `translateY(${offset}px)`;
    item.style.transition = 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)';
    
    // Add subtle visual feedback for items that are moving
    if (offset !== 0) {
      item.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.12)';
    } else {
      item.style.boxShadow = '';
    }
  });
}

function resetGroceryPreviewOrder() {
  document.querySelectorAll('.grocery-item').forEach(item => {
    if (item !== draggedGroceryElement) {
      item.style.transform = 'translateY(0px)';
      item.style.transition = 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)';
      item.style.boxShadow = '';
    }
  });
}

async function saveNewGroceryOrder(newIndex) {
  try {
    const draggedGrocery = groceries.find(g => g.id === draggedGroceryId);
    if (!draggedGrocery) return;
    
    // Calculate new order based on position
    let newOrder;
    const SPACING = 1000;
    
    if (newIndex === 0) {
      // Moving to the beginning
      const firstGrocery = groceries[0];
      newOrder = firstGrocery ? (firstGrocery.order || 0) - SPACING : SPACING;
    } else if (newIndex >= groceries.length) {
      // Moving to the end
      const lastGrocery = groceries[groceries.length - 1];
      newOrder = (lastGrocery.order || 0) + SPACING;
    } else {
      // Moving between items
      let beforeIndex, afterIndex;
      
      if (draggedGroceryIndex < newIndex) {
        // Moving down
        beforeIndex = newIndex - 1;
        afterIndex = newIndex;
      } else {
        // Moving up
        beforeIndex = newIndex - 1;
        afterIndex = newIndex;
      }
      
      const beforeGrocery = beforeIndex >= 0 ? groceries[beforeIndex] : null;
      const afterGrocery = afterIndex < groceries.length ? groceries[afterIndex] : null;
      
      const beforeOrder = beforeGrocery ? (beforeGrocery.order || 0) : 0;
      const afterOrder = afterGrocery ? (afterGrocery.order || 0) : (beforeOrder + SPACING);
      
      const gap = afterOrder - beforeOrder;
      if (gap <= 1) {
        await rebalanceGroceryOrders();
        return saveNewGroceryOrder(newIndex);
      }
      
      newOrder = beforeOrder + (gap / 2);
    }
    
    // Update in Firestore
    const groceryRef = doc(db, 'groceries', draggedGroceryId);
    await updateDoc(groceryRef, { order: newOrder });
    
    // Update local state
    const groceryIndex = groceries.findIndex(g => g.id === draggedGroceryId);
    if (groceryIndex !== -1) {
      groceries[groceryIndex].order = newOrder;
    }
    
    // Re-render
    renderGroceries();
  } catch (error) {
    console.error('Error saving new grocery order:', error);
    resetGroceryPreviewOrder();
  }
}

async function rebalanceGroceryOrders() {
  try {
    const currentGroup = getCurrentGroup();
    const sortedGroceries = groceries
      .filter(grocery => {
        if (currentGroupId === 'personal') {
          return !grocery.groupId || grocery.groupId === 'personal';
        }
        return grocery.groupId === currentGroupId;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const SPACING = 1000;
    for (let i = 0; i < sortedGroceries.length; i++) {
      const newOrder = (i + 1) * SPACING;
      const groceryRef = doc(db, 'groceries', sortedGroceries[i].id);
      await updateDoc(groceryRef, { order: newOrder });
      
      // Update local state
      const localIndex = groceries.findIndex(g => g.id === sortedGroceries[i].id);
      if (localIndex !== -1) {
        groceries[localIndex].order = newOrder;
      }
    }
  } catch (error) {
    console.error('Error rebalancing grocery orders:', error);
  }
}

async function reorderTodos(draggedId, targetId) {
  try {
    // Find the todos in the current filtered list
    const currentTodos = getFilteredTodos();
    const draggedIndex = currentTodos.findIndex(t => t.id === draggedId);
    const targetIndex = currentTodos.findIndex(t => t.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Calculate proper order value based on drop position
    let newOrder;
    const SPACING = 1000; // Large spacing to avoid precision issues
    
    if (draggedIndex < targetIndex) {
      // Moving down: place after target
      const nextIndex = targetIndex + 1;
      if (nextIndex < currentTodos.length) {
        // Insert between target and next item
        const targetOrder = currentTodos[targetIndex].order || 0;
        const nextOrder = currentTodos[nextIndex].order || 0;
        const gap = nextOrder - targetOrder;
        
        // If gap is too small, rebalance the entire list
        if (gap <= 1) {
          await rebalanceTodoOrders();
          return reorderTodos(draggedId, targetId); // Retry after rebalancing
        }
        newOrder = Math.floor((targetOrder + nextOrder) / 2);
      } else {
        // Insert at the end
        newOrder = (currentTodos[targetIndex].order || 0) + SPACING;
      }
    } else {
      // Moving up: place before target
      const prevIndex = targetIndex - 1;
      if (prevIndex >= 0) {
        // Insert between previous and target item
        const prevOrder = currentTodos[prevIndex].order || 0;
        const targetOrder = currentTodos[targetIndex].order || 0;
        const gap = targetOrder - prevOrder;
        
        // If gap is too small, rebalance the entire list
        if (gap <= 1) {
          await rebalanceTodoOrders();
          return reorderTodos(draggedId, targetId); // Retry after rebalancing
        }
        newOrder = Math.floor((prevOrder + targetOrder) / 2);
      } else {
        // Insert at the beginning
        newOrder = (currentTodos[targetIndex].order || 0) - SPACING;
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

// Rebalance todo orders when they get too close together
async function rebalanceTodoOrders() {
  try {
    const currentTodos = getFilteredTodos();
    const SPACING = 1000;
    
    const updatePromises = currentTodos.map((todo, index) => {
      const newOrder = index * SPACING;
      return updateDoc(doc(db, 'todos', todo.id), {
        order: newOrder,
        updatedAt: serverTimestamp()
      });
    });
    
    await Promise.all(updatePromises);
    console.log('Rebalanced todo orders');
  } catch (error) {
    console.error('Error rebalancing todo orders:', error);
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


async function addGrocery() {
  const textInput = document.getElementById('groceryInput');
  const quantityInput = document.getElementById('quantityInput');
  const text = textInput.value.trim();
  const quantity = quantityInput.value || '1';
  
  if (text && currentUser) {
    try {
      const currentGroup = getCurrentGroup();
      const isPrivate = document.getElementById('groceryPrivacyToggle')?.checked || false;
      
      // Calculate order for new grocery (add at the end)
      const maxOrder = groceries.length > 0 ? Math.max(...groceries.map(g => g.order || 0)) : 0;
      
      await addDoc(collection(db, 'groceries'), {
        text: text,
        quantity: quantity,
        completed: false,
        userId: currentUser.uid,
        groupId: currentGroupId === 'personal' ? null : currentGroupId,
        isPrivate: isPrivate && currentGroupId !== 'personal',
        order: maxOrder + 1000, // Add at the end with spacing
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
      
      const currentGroup = getCurrentGroup();
      await addDoc(collection(db, 'events'), {
        name: name,
        description: description || '',
        location: location || '',
        datetime: eventDateTime,
        userId: currentUser.uid,
        groupId: currentGroupId === 'personal' ? null : currentGroupId,
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
  
  const formatDate = (date) => {
    if (!date) return null;
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString();
  };
  
  // Create HTML with sortable items (no drop zones)
  let html = '';
  
  filteredTodos.forEach((todo, index) => {
    const categoryColor = getCategoryColor(todo.category);
    const priorityColor = priorityColors[todo.priority] || '#ff9800';
    
    // Add the todo item with drag handle
    html += `
      <div 
        class="todo-item"
        draggable="true"
        data-todo-id="${todo.id}"
        data-original-index="${index}"
        style="
          display: flex;
          align-items: flex-start;
          background: ${bgColor};
          backdrop-filter: blur(20px);
          padding: 20px;
          border-radius: 16px;
          border: 1px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
          box-shadow: 0 4px 16px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
          transition: all 0.3s ease;
          margin-bottom: 8px;
          transform: translateY(0px);
          cursor: grab;
        " 
        onmouseover="if (!window.draggedTodoId) this.style.transform='translateY(-2px)'" 
        onmouseout="if (!window.draggedTodoId && !this.classList.contains('dragging')) this.style.transform='translateY(0px)'"
        ondragstart="handleTodoDragStart(event, '${todo.id}', ${index});"
        ondragend="handleTodoDragEnd(event);"
        title="Drag to reorder">
        
        <button draggable="false" onclick="toggleTodo('${todo.id}')" style="
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
            ">${todo.text}${todo.isPrivate ? ' <span style="color: #f59e0b; font-size: 14px; margin-left: 8px;" title="Private - only visible to you">🔒</span>' : ''}</div>
            
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
          <button draggable="false" onclick="editTodo('${todo.id}')" style="
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
          " onmouseover="if (!window.draggedTodoId) this.style.background='${isDarkMode ? 'rgba(100, 181, 246, 0.1)' : 'rgba(33, 150, 243, 0.1)'}'" onmouseout="if (!window.draggedTodoId) this.style.background='none'">✏️</button>
          <button draggable="false" onclick="deleteTodo('${todo.id}')" style="
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
          " onmouseover="if (!window.draggedTodoId) this.style.background='${isDarkMode ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 59, 48, 0.1)'}'" onmouseout="if (!window.draggedTodoId) this.style.background='none'">×</button>
        </div>
      </div>
    `;
  });
  
  // Add a subtle drop zone at the end for dropping items at the bottom
  html += `
    <div 
      class="bottom-drop-zone"
      style="
        height: 30px;
        margin-top: 4px;
        border-radius: 8px;
        transition: all 0.3s ease;
        opacity: 0;
        border: 1px solid transparent;
      "
      ondragover="handleBottomDropZoneDragOver(event)"
      ondragleave="handleBottomDropZoneDragLeave(event)"
      ondrop="handleBottomDropZoneDrop(event)">
    </div>
  `;
  
  todosList.innerHTML = html;
  
  // Add drag over listeners to todo items for real-time reordering
  document.querySelectorAll('.todo-item').forEach(item => {
    item.addEventListener('dragover', handleTodoItemDragOver);
    item.addEventListener('dragleave', handleTodoItemDragLeave);
  });
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

  // Create HTML with sortable items (no drop zones)
  let html = '';
  
  sortedGroceries.forEach((grocery, index) => {
    html += `
    <div 
      class="grocery-item"
      draggable="true"
      data-grocery-id="${grocery.id}"
      data-original-index="${index}"
      style="
        display: flex;
        align-items: center;
        background-color: ${isDarkMode ? 'rgba(40, 40, 40, 0.95)' : 'white'};
        padding: 15px;
        margin-bottom: 8px;
        border-radius: 12px;
        border: 1px solid ${isDarkMode ? '#404040' : '#e2e8f0'};
        box-shadow: 0 4px 16px rgba(0, 0, 0, ${isDarkMode ? '0.3' : '0.1'});
        cursor: grab;
        transition: all 0.3s ease;
        transform: translateY(0px);
      "
      onmouseover="if (!draggedGroceryId) this.style.transform='translateY(-2px)'" 
      onmouseout="if (!draggedGroceryId && !this.classList.contains('dragging')) this.style.transform='translateY(0px)'"
      ondragstart="handleGroceryDragStart(event, '${grocery.id}', ${index});"
      ondragend="handleGroceryDragEnd(event);"
      title="Drag to reorder">
      <button draggable="false" onclick="toggleGrocery('${grocery.id}')" style="
        width: 24px;
        height: 24px;
        border-radius: 12px;
        border: 2px solid #34C759;
        background-color: ${grocery.completed ? '#34C759' : (isDarkMode ? 'transparent' : 'white')};
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
      
      <button draggable="false" onclick="deleteGrocery('${grocery.id}')" style="
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
    `;
  });
  
  // Add a subtle drop zone at the end for dropping items at the bottom
  html += `
    <div 
      class="bottom-drop-zone-grocery"
      style="
        height: 30px;
        margin-top: 4px;
        border-radius: 8px;
        transition: all 0.3s ease;
        opacity: 0;
        border: 1px solid transparent;
      "
      ondragover="handleBottomDropZoneGroceryDragOver(event)"
      ondragleave="handleBottomDropZoneGroceryDragLeave(event)"
      ondrop="handleBottomDropZoneGroceryDrop(event)">
    </div>
  `;
  
  groceriesList.innerHTML = html;
  
  // Add drag over listeners to grocery items for real-time reordering
  document.querySelectorAll('.grocery-item').forEach(item => {
    item.addEventListener('dragover', handleGroceryItemDragOver);
    item.addEventListener('dragleave', handleGroceryItemDragLeave);
  });
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
if (localStorage.getItem('darkMode')) {
  isDarkMode = JSON.parse(localStorage.getItem('darkMode'));
}

// Auth state listener
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  
  if (user) {
    console.log('User signed in:', user.email);
    
    // Load user profile data including firstName
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        firstName = userData.firstName || '';
        console.log('Loaded firstName:', firstName);
      }
    } catch (error) {
      console.log('Error loading user profile:', error);
      firstName = '';
    }
    
    // Restore saved group context from localStorage
    const savedGroupId = localStorage.getItem('currentGroupId');
    if (savedGroupId) {
      currentGroupId = savedGroupId;
      console.log('Restored group context:', currentGroupId);
    } else {
      console.log('No saved group found, using default:', currentGroupId);
    }
    
    showMainScreen();
    
    // Set up real-time listeners with group context (includes groups listener)
    setupRealtimeListeners();
    
    // Apply group theme after DOM is ready
    setTimeout(() => {
      applyGroupTheme();
    }, 100);
    
  } else {
    console.log('User signed out');
    
    // Clean up all listeners
    if (todosUnsubscribe) todosUnsubscribe();
    if (groceriesUnsubscribe) groceriesUnsubscribe();
    if (eventsUnsubscribe) eventsUnsubscribe();
    if (tagsUnsubscribe) tagsUnsubscribe();
    if (groupsUnsubscribe) groupsUnsubscribe();
    
    // Clear data when signed out
    todos = [];
    groceries = [];
    events = [];
    tags = [];
    groups = [];
    currentGroupId = 'personal';
    
    showLoginScreen();
  }
});

// Initialize the app
function initializeAppState() {
  // Initialize currentGroupId from localStorage
  const savedGroupId = localStorage.getItem('currentGroupId');
  if (savedGroupId) {
    currentGroupId = savedGroupId;
  }
  
  // Apply initial theme
  applyGroupTheme();
  
  createApp();
}

initializeAppState();

