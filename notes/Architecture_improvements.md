# Architecture Improvements

This document tracks technical improvements and architectural refactoring performed in the ChatApp codebase.

---

## Problem 1: In-Memory Message Aggregation for Sidebar Chats

### Description
In our initial implementation, the list of active chat partners shown in the sidebar was computed dynamically on the fly by scanning all messages. The backend fetched every single message involving the logged-in user from the database, grouped them by partner in Node.js server memory, kept only the latest message for each partner, and then queried the database again for user profiles.

### Issue with this
1. **Performance & Memory Bottlenecks**: As a user's messaging history grows, this query becomes extremely slow. For a user with 50,000 messages, the backend had to pull 50,000 database documents into server RAM on every single page load just to determine the 5 active chats to show in the sidebar. This consumes massive server memory and blocks the Node.js event loop.
2. **Database Overhead**: Scans the entire `messages` collection instead of retrieving specific indexed documents.
3. **No Group Chat Support**: The system relied on dynamic string-joined `chatId`s (`userId1_userId2`). This logic breaks down when trying to add a third participant, making Group Chats (Phase 3) impossible to implement.

### Solution
We introduced a permanent **`Conversation` Schema** to separate the message stream from the conversation context.

1. **Persistent Conversation Collection**: Created a new `conversations` model containing:
   * `participants`: An array of User IDs involved in the chat.
   * `isGroup`: A boolean flag indicating if it's a 1-to-1 or group chat.
   * `lastMessage`: A direct reference (ObjectId) to the latest Message document.
2. **Index-Based Lookups**: Created a multikey index on `participants` in MongoDB. Finding active chats is now a single, lightning-fast query:
   ```javascript
   Conversation.find({ participants: currentUserId }).populate('lastMessage')
   ```
   If a user has 100,000 messages across 5 active chats, the server now only fetches 5 conversation documents, avoiding the messages scan completely.
3. **Optimized Write-Flow**: When a new message is sent, the backend finds or creates the conversation document, saves the message referencing the conversation ID as the `chatId`, and updates the conversation's `lastMessage` pointer.
4. **Backward Compatibility**: Implemented a fallback parser on the backend so that messages using the legacy dynamic `userIdA_userIdB` format are resolved, grouped, and migrated to conversation records seamlessly without breaking existing history.

---

## Problem 2: Untyped Message Schema, No Query Indexes, and Rigid 1-to-1 Design

### Description
Initially, the `Message` schema stored reference keys (`chatId`, `senderId`, `receiverId`) as plain `String` types rather than Mongoose `ObjectId` references. Additionally, it lacked compound indexes for chronological queries and had no support for media attachments or group chat read receipts.

### Schema Comparison (Old vs. New)

```javascript
// --- OLD SCHEMA SNIPPET ---
chatId: { type: String, required: true, index: true },
senderId: { type: String, required: true, index: true },
receiverId: { type: String, required: true, index: true },
text: { type: String, required: true, trim: true },
status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent', index: true }
```

```javascript
// --- NEW SCHEMA SNIPPET ---
chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
text: { type: String, required: false, trim: true },
messageType: { type: String, enum: ['text', 'image', 'video', 'audio', 'file', 'system'], default: 'text' },
fileAttachment: {
  url: { type: String, default: null },
  name: { type: String, default: null },
  size: { type: Number, default: null },
  mimeType: { type: String, default: null }
},
status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent', index: true },
readBy: [{
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  readAt: { type: Date, default: Date.now }
}]
```

### Issue with Old Schema
1. **Lack of Referential Integrity**: Storing IDs as raw strings prevented Mongoose from validating if messages belonged to existing conversations or users, making database joins (`.populate()`) impossible.
2. **In-Memory Sort Bottlenecks**: Message history was retrieved via `Message.find({ chatId }).sort({ createdAt: 1 })`. Without a compound index, MongoDB was forced to scan all messages in a chat and sort them in RAM, leading to performance degradation on larger conversations.
3. **Inflexible Schema**: Storing messages as text-only and requiring a single `receiverId` made it impossible to support group chats (which have multiple receivers) or file/voice attachments.

### Solution Details
We redesigned and refactored the Message Schema:
1. **Strongly-Typed References**: Changed references to Mongoose `ObjectId` types pointing to the `Conversation` and `User` collections.
   * **How it works**:
     * `ObjectId` stores the ID of another document (e.g., a user), and `ref: "User"` tells Mongoose **which collection** that ID belongs to.
     * The message document itself stores only the `senderId` and `receiverId`, not the user's full details.
     * Without `.populate()`, we would have to manually query the `User` collection using `User.findById(message.senderId)`.
     * Calling `.populate("senderId")` automatically performs that extra query behind the scenes, replacing the `senderId` field in the returned result with the corresponding User document (or selected fields like `name` and `image`).
     * This **does not change the data stored in MongoDB**—it only changes the object returned to your application.
2. **Compound Index**: Created an index on `{ chatId: 1, createdAt: 1 }` so message lookups and chronological rendering are handled directly by the index on disk without sorting.
3. **Group & Media Extensibility**:
   * Set `receiverId` as optional (nullable) to support group conversations.
   * Introduced `messageType` and a `fileAttachment` object structure for future media uploads.
   * Added a `readBy` array containing reader IDs and read timestamps to track read receipts across group participants, while preserving the lightweight 1-to-1 status logic.

---

## Problem 3: Scalability and Boundary Issues with Offset Pagination

### Description
The message history API initially returned the entire chat history in a single fetch. When implementing pagination, choosing offset-based pagination (`skip` and `limit`) would have introduced database query performance issues and UI rendering bugs.

### Issue with Offset Pagination
1. **$O(N)$ Database Performance**: Using `.skip(1000)` forces MongoDB to read 1,000 documents from disk into memory and discard them just to return the next 20. As chat history grows, retrieving older pages becomes increasingly slow.
2. **Page-Boundary Drift (The "Moving Goalpost" Bug)**: 
   * `skip()` pagination is unreliable for chats because new incoming messages change the positions of older messages.
   * This causes the **"moving goalpost" bug**, where loading the next page can return duplicate or missing messages to the user.

### Solution (Keyset Cursor Pagination)
We implemented cursor-based pagination using the message ID:
1. **Constant $O(1)$ Performance**: 
   * Chat messages are always fetched with **sorting** (`.sort({ _id: -1 })`) so the newest messages appear first.
   * `.limit(20)` returns only the first 20 messages **after sorting**.
   * By querying messages older than the oldest visible message ID (`{ _id: { $lt: oldestMessageId } }`) combined with the compound index `{ chatId: 1, _id: -1 }`, MongoDB jumps directly to the cursor position and reads only the requested slice of documents.
2. **Stable Query Boundaries**: 
   * **Cursor pagination** solves the moving goalpost bug by fetching messages **older than a specific message** (using the unique `_id` cursor) instead of skipping a number of records.
   * Since a message's `_id` never changes, the cursor remains stable even when new messages arrive.

### Visualizing the "Moving Goalpost" Bug

1. **Initial State (Newest First)**: Database has messages `[989, 988, 987, 986, 985, 984, ...]`.
   * User loads Page 1 (`limit: 5`, `skip: 0`) -> returns `[989, 988, 987, 986, 985]`.
2. **Two New Messages Arrive**: Messages `991, 990` are added at the top.
   * Database becomes `[991, 990, 989, 988, 987, 986, 985, 984, ...]`. Old items shift down by 2.
3. **User Scrolls to Page 2** (`limit: 5`, `skip: 5`):
   * MongoDB skips the first 5 (`991-987`) and returns `[986, 985, 984, 983, 982]`.
   * **The Bug**: User sees `986` and `985` again (duplicates) because the skip boundary shifted.

### The Cursor Solution
Instead of skipping, we query for messages older than the oldest visible message (`985`):
```javascript
Message.find({ _id: { $lt: oldestVisibleId } }) // oldestVisibleId = 985
  .sort({ _id: -1 })
  .limit(5)
```
* Returns `[984, 983, 982, 981, 980]`. No duplicates or gaps, regardless of new arrivals.

---

## Problem 4: Horizontal Scaling Limitation of Default Socket.IO Adapter

<span style="color:red">**Note: This architecture improvement will be implemented later when scaling the application horizontally.**</span>

For full technical specifications, architecture diagrams, and the Redis Pub/Sub coordination walkthrough, see:
*   [socketioBroadcasting.md](./socketioBroadcasting.md)

