# Revision Notes: Group Chats & Role-Based Access Control (RBAC)

This document explains the technical architecture, data structures, and authorization logic implemented during **Phase 3: Group Chats**.

---

## 1. Schema Architecture Refactoring

To support group functionalities, we migrated the [Conversation](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/models/conversationModel.js#L3) schema from a flat array of user IDs to a structured, metadata-rich members list.

### 1-to-1 Chat Schema (Before)
```javascript
participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
```

### Group Chat Schema (After - Option A)
```javascript
const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now }
})

const conversationSchema = new mongoose.Schema({
  members: [memberSchema],
  isGroup: { type: Boolean, default: false },
  name: { type: String, default: null },
  avatar: { type: String, default: null },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
})
```

---

## 2. Why We Needed `isGroup` & Subdocument Arrays

* **Logical Separation:** Even if a group chat gets reduced to two people (because others left), it must **not** merge with their private 1-to-1 conversation history. `isGroup: true` serves as a query discriminator.
* **Metadata Extensibility:** Storing member information as subdocuments allows tracking roles (`owner`, `admin`, `member`) and timestamps (`joinedAt`) directly inline without needing join tables.

---

## 3. Role-Based Access Control (RBAC) Hierarchy

Roles are defined in order of privilege: `owner` (3) > `admin` (2) > `member` (1). 

### Authorization Matrix
1. **Members (`role: 'member'`)**: Read/send messages, leave the group.
2. **Admins (`role: 'admin'`)**: All member privileges + add members, kick normal members, rename group, change group avatar.
3. **Owner (`role: 'owner'`)**: All admin privileges + promote members, demote admins, remove admins, transfer ownership, delete the group.

### Enforcement Logic (Backend)
To protect endpoints, we retrieve the conversation and verify the requester's role:

```javascript
async function verifyGroupPermission(chatId, userId, requiredRole) {
  const conversation = await Conversation.findById(chatId)
  if (!conversation || !conversation.isGroup) return false

  const member = conversation.members.find(m => m.userId.toString() === userId)
  if (!member) return false

  const roleHierarchy = { owner: 3, admin: 2, member: 1 }
  return roleHierarchy[member.role] >= roleHierarchy[requiredRole]
}
```

---

## 4. Group Read Receipts vs. 1-to-1 Receipts

### 1-to-1 Chats
* **Status Field:** Uses a simple string `status` enum (`'sent'`, `'delivered'`, `'read'`).
* **Update Query:** Set `status: 'read'` when the recipient opens the chat.

### Group Chats
* **`readBy` Array:** A simple string status is not enough because a message can be read by *some* group members but not all. 
* **Model Schema:**
  ```javascript
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }]
  ```
* **Update Query:** When a user opens a group chat, they push their `userId` to the `readBy` array of all group messages they did not send:
  ```javascript
  await Message.updateMany(
    { chatId, senderId: { $ne: userId }, 'readBy.userId': { $ne: userId } },
    { $addToSet: { readBy: { userId, readAt: new Date() } } }
  )
  ```

---

## 5. Socket.IO Room Topology & Dynamic Joining

Unlike 1-to-1 messages (which are targeted directly to the individual participant's private channel), group messages and notifications are routed through **Socket.IO Rooms** mapped to the conversation's database `_id`.

1. **Auto-joining on Connect:** When a client establishes a socket connection, the server queries the database for all groups the user belongs to and makes the socket join those rooms:
   ```javascript
   Conversation.find({ 'members.userId': userId }).then(convos => {
     convos.forEach(c => socket.join(c._id.toString()))
   })
   ```
2. **Dynamic Joining:** When a user is added to a new group, the frontend triggers a `join_group_rooms` event so the user joins the room in real-time without needing to re-login.
3. **Targeted Broadcast:** Messages are sent to `io.to(chatId)` to update all group members simultaneously:
   ```javascript
   io.to(chatId).emit('new_message', { ...message, senderName: socket.username })
   ```

---

## 6. Group Action Audit Trails (System Messages)

To keep all group members informed of membership and role modifications, group actions write **System Messages** directly to the chat timeline:

1. **System Message Definition:** A message document with `messageType: 'system'` containing an audit string describing the action (e.g. `"Ravindra promoted Krish to admin"`).
2. **Backend Triggers:** Inside [groupController.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/controllers/groupController.js), a centralized helper function creates, saves, and broadcasts these events to the group room room:
   ```javascript
   async function createSystemMessage(chatId, senderId, text) {
     const message = await Message.create({
       chatId,
       senderId,
       text,
       messageType: 'system',
       status: 'sent'
     })
     await Conversation.findByIdAndUpdate(chatId, { lastMessage: message._id })
     const io = getIo()
     if (io) {
       io.to(chatId).emit('new_message', { ...message.toObject(), senderName: 'System' })
     }
   }
   ```
3. **Frontend Presentation:** In [ChatPage.jsx](file:///c:/Users/mrsan/Desktop/Boilerplate/frontend/src/pages/ChatPage.jsx), messages matching `messageType === 'system'` bypass the standard bubble alignment/avatar container code and render inside a centered, semi-transparent pill overlay.
