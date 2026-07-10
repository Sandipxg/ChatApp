# Advanced Messaging Features (Phase 5)

This document details the architectural design and rules for advanced messaging capabilities implemented in Phase 5.

---

## 1. Message Editing

### Definition
Message editing allows users to modify the text content of a message they have already sent. This is crucial for correcting typos or updating information without cluttering the chat with follow-up correction messages.

### Business Rules & Constraints
To ensure a secure, fair, and scalable messaging experience, we enforce the following rules:

1. **Sender Only**: Only the sender of the message can edit it.
2. **Text Only**: Only text-based messages (`messageType === 'text'`) can be edited. Media messages (images, videos, etc.) are immutable.
3. **10-Minute Window**: A message can only be edited within 10 minutes of its original creation time (`createdAt`).
4. **Single-Edit Limitation**: A message can be edited **exactly once**. Once modified, the edit action is permanently disabled (`isEdited: true` blocks further edits).
5. **Transparency Indicator**: Edited messages display an `(edited)` visual tag next to the timestamp.

---

### Technical Implementation

#### Backend API & Database
- **Database Schema**: Added `isEdited` (Boolean) and `editedAt` (Date) fields to [messageModel.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/models/messageModel.js).
- **Atomic Operations**: Implemented the update in [chatController.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/controllers/chatController.js) using MongoDB's `findOneAndUpdate` to prevent race conditions and minimize DB lookups:
  ```javascript
  const updatedMessage = await Message.findOneAndUpdate(
    {
      _id: messageId,
      senderId: userId,
      messageType: 'text',
      createdAt: { $gte: tenMinutesAgo },
      isEdited: false
    },
    {
      $set: {
        text: text.trim(),
        isEdited: true,
        editedAt: new Date()
      }
    },
    { new: true }
  )
  ```
- **Socket Synchronization**: Broadcasts `message_edit` WebSocket event to room participants.

#### Frontend UI
- **Hover & Long-Press Triggers**:
  - **Desktop**: A sleek hover menu displays a pencil icon on hover, and desktop users can also right-click to open a custom menu.
  - **Mobile**: Touch-hold (~550ms) triggers a custom glassmorphic bottom-sheet actions overlay.
- **Copy Utility**: Built-in copy-to-clipboard function directly in the context menu.
- **Main Input Integration**: Editing is handled in the main text box with a dedicated "Editing Message" banner and cancellation buttons.
- **Layout Overlap Solution**: Designed dynamic padding and min-width to prevent collisions with absolute-positioned status indicators:
  - Own edited message padding: `pr-[115px]`
  - Own edited message min-width: `min-w-[130px]`

---

## 2. Message Deletion (Soft & Hard Deletion)

### Concepts & Business Rules

*   **Soft Deletion (Delete for Everyone & Delete for Me)**:
    - Message document is **not** physically removed from the database.
    - For *Delete for Everyone*, text is cleared and attachments nullified to prevent leak, setting `isDeleted: true`. The UI renders *"This message was deleted"*.
    - For *Delete for Me*, the message is hidden for the choosing user but kept visible for others by pushing the user's ID to `deletedBy` list.
*   **Hard Deletion**:
    - Message document is physically purged from the database (using `deleteOne`/`deleteMany`).
    - Used for disappearing messages, GDPR purges, or system cleanup. Any media files are deleted from cloud storage first.
*   **Business Rules**:
    1.  **Delete for Everyone**: Sender only, within a 24-hour window from creation.
    2.  **Delete for Me**: Any participant, no time window restrictions.

---

### Delete for Me: Step-by-Step Flow
1. **User Action**: The user clicks or taps "Delete for Me" in the desktop context menu or mobile bottom-sheet in [ChatPage.jsx](file:///c:/Users/mrsan/Desktop/Boilerplate/frontend/src/pages/ChatPage.jsx). This triggers the local handler `handleDeleteMeClick()`.
2. **Immediate UI Update**: The top-level React controller `handleDeleteMe()` in [ChatPage.jsx](file:///c:/Users/mrsan/Desktop/Boilerplate/frontend/src/pages/ChatPage.jsx) updates the state (`setMessages` and `setPartners`) to filter out the deleted message ID instantly, so the user sees it vanish with no lag.
3. **HTTP Client Request**: The client dispatches an HTTP request via the wrapper function `deleteMessageForMe()` in [chatService.js](file:///c:/Users/mrsan/Desktop/Boilerplate/frontend/src/services/chatService.js), hitting `DELETE /api/chat/messages/:messageId/me`.
4. **API Routing**: The route is received in [chat.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/routes/chat.js) and calls `chatController.deleteMessageForMe`.
5. **Database Transaction**: The controller `deleteMessageForMe()` in [chatController.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/controllers/chatController.js) executes a Mongoose update on the `Message` model in [messageModel.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/models/messageModel.js), using the `$addToSet` operator to push the user's ID into the message's `deletedBy` array. (No real-time socket events are broadcasted, keeping the operation private to this user).
6. **Query History Filtering**: When fetching messages subsequently, `getMsgByChatid()` in [chatController.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/controllers/chatController.js) queries the database using `{ deletedBy: { $ne: currentUserId } }`. This ensures the database skips the message for the current user while returning it normally for other room members.

---

### Delete for Everyone: Step-by-Step Flow
1. **User Action**: The message sender clicks or taps "Delete for Everyone" in the context menu of [ChatPage.jsx](file:///c:/Users/mrsan/Desktop/Boilerplate/frontend/src/pages/ChatPage.jsx). This triggers the local handler `handleDeleteEveryoneClick()`.
2. **HTTP Client Request**: The frontend calls the API wrapper function `deleteMessageForEveryone()` in [chatService.js](file:///c:/Users/mrsan/Desktop/Boilerplate/frontend/src/services/chatService.js), dispatching a `DELETE` request to `/api/chat/messages/:messageId/everyone`.
3. **API Routing**: The route is received in [chat.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/routes/chat.js) and calls `chatController.deleteMessageForEveryone`.
4. **Database Transaction**: The controller `deleteMessageForEveryone()` in [chatController.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/controllers/chatController.js) checks sender authenticity and the 24-hour limit, then atomically updates the `Message` model in [messageModel.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/models/messageModel.js), setting `isDeleted` to `true`, clearing `text` to `""`, and nullifying `fileAttachment` properties to safely wipe the data.
5. **Real-time Broadcast**: The controller broadcasts a `'message_deleted_everyone'` socket event via `socketService.js` to all participants currently joined in the conversation room.
6. **Real-time UI Sync**: The socket listener in [ChatPage.jsx](file:///c:/Users/mrsan/Desktop/Boilerplate/frontend/src/pages/ChatPage.jsx) catches the event, executing `handleMessageDeleteEveryone()`. This maps matching IDs in the message state list and sets `isDeleted: true` to update the bubble in real-time.
7. **UI Rendering**: The rendering engine in [ChatPage.jsx](file:///c:/Users/mrsan/Desktop/Boilerplate/frontend/src/pages/ChatPage.jsx) checks if `msg.isDeleted` is `true`, displaying a muted, italicised bubble reading *"This message was deleted"*, hiding all attachments and disabling click actions.

---

## 3. Emoji Reactions

### Architecture & Data Model
*   **Database Schema**: Stored as a nested subdocument array (`reactions`) directly inside the `Message` model:
    ```javascript
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        emoji: { type: String, required: true },
        reactedAt: { type: Date, default: Date.now }
      }
    ]
    ```
*   **Application Logic**:
    - Restricted to 6 fixed preset emojis: `👍`, `❤️`, `😂`, `😮`, `😢`, `🙏`.
    - Toggling an emoji (clicking an already reacted emoji by the same user) removes the reaction.
    - Each user can have only one reaction per message. If they select a different emoji, it replaces their existing one.

### How massive-scale platforms (like Slack or Discord) handle it
At extreme scale (millions of concurrent users reacting to a single message in a public channel), the nested array approach hits constraints:

*   **Document Size Limit**: MongoDB has a 16MB document limit. If 50,000 users react to one announcement message, the document will exceed this size.
*   **Document Fragmentation**: Continuously adding elements to an array causes the document to grow physically on disk, forcing MongoDB to relocate the document, which degrades performance.

**The Massive-Scale Solution**: For high-scale platforms, reactions are treated as a separate, normalized collection/table stored in databases designed for heavy writes (such as Cassandra, ScyllaDB, or DynamoDB), fronted by a cache layer (like Redis) that aggregates reaction counts.

Since this project focuses on 1-to-1 and private group chats, the nested subdocuments pattern is the most optimal, performant, and clean implementation.

---

## 4. Message Pinning

### Database Schema Approaches
*   **Approach A: Embedded Array inside Conversation (WhatsApp/Telegram Style)**: Pinned message references are stored directly inside a `pinnedMessages` array inside the `Conversation` document.
    *   *Pros*: Instant query (loads with conversation metadata), simple pin-limit validation.
    *   *Cons*: Bloats conversation document if pinning is unlimited.
*   **Approach B: Separate PinnedMessages Collection (Slack/Discord Style)**: Pins are stored in a standalone collection mapping `chatId` to `messageId`.
    *   *Pros*: Scales to unlimited pins per conversation.
    *   *Cons*: Requires a separate database lookup query to retrieve pins.

### Implementation Details (Approach A)

#### 1. Schema Definition
Added the `pinnedMessages` array inside `conversationSchema` in [conversationModel.js](file:///c:/Users/mrsan/Desktop/Boilerplate/backend/models/conversationModel.js):
```javascript
pinnedMessages: [
  {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pinnedAt: { type: Date, default: Date.now }
  }
]
```
