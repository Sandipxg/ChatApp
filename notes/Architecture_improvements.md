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
