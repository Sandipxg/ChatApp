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
