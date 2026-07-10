# Search Indexing in Chat Applications

This document outlines the three main architectural approaches to implementing search in real-time chat applications, along with their trade-offs and key design FAQs.

---

## 1. The Three Architectural Approaches

### Approach A: Regex Queries (Local Scan)
*   **Concept**: Pattern matching using regular expressions directly on text fields (e.g., `{ text: { $regex: query, $options: 'i' } }`).
*   **Pros**: Zero write overhead, no disk/memory storage costs, and extremely simple to code.
*   **Cons**:
    > [!CAUTION]
    > **Performance Bottleneck (Full Table Scan)**: If executed globally across the entire database, it triggers a collection-wide scan, reading every single document in memory. This causes massive database CPU spikes. It is only viable when filtered strictly by an indexed `chatId` to isolate the scan to a single conversation.

---

### Approach B: Native MongoDB Text Indexing
*   **Concept**: MongoDB automatically parses sentences into root words (tokenization & stemming) and maintains a hidden inverted index map pointing words to document IDs.
*   **Pros**: Rapid lookup speeds for word search without reading text documents during search.
*   **Cons**:
    > [!CAUTION]
    > **Write Amplification & Storage Overhead**: Every message insertion requires updating the index tree. This slows down write speeds (`Message.create()`), increases RAM consumption (as indexes must fit in memory), and increases disk usage by storing duplicate string keys.
    > 
    > **No Typo Tolerance**: Searching for `"dinosaur"` will not match `"dinosour"`. Typo matching is non-existent.

---

### Approach C: Dedicated Search Engines (Slack/Discord Scale)
*   **Concept**: Decoupled search architecture where messages are saved in MongoDB and concurrently replicated (via Change Streams/Message Queues) to a dedicated search cluster (e.g. Elasticsearch or Meilisearch).
*   **Pros**: Blazing fast search, phonetic matching, typo tolerance, advanced filters, and zero CPU load on the primary transactional database.
*   **Cons**:
    > [!CAUTION]
    > **High Complexity & Infrastructure Cost**:
    > *   **Synchronization overhead**: Sync workers must handle eventual consistency lags, and updates/deletions of messages must be manually synced to prevent deleted messages from leaking in search results.
    > *   **High Hosting Costs**: Elasticsearch requires significant RAM (usually minimum 2GB to 4GB per node) to keep the search index in memory. This adds another server to your monthly hosting bill.

---

## 2. Common Architectural Doubts & FAQs

### Q1: Does MongoDB scan the entire message database for every Regex query?
Only if you do a global search. If you do a local search (within one chat window) and index `chatId`, MongoDB uses the index to filter messages by `chatId` first, reducing the scan scope from millions of messages to just a few hundred.

### Q2: Does MongoDB create indexes for every new unique word?
Yes, for text indexes (Approach B). It splits sentences, strips "stop words" (e.g., *a, the, is, am*), and creates a row in its dictionary map for every unique root word it finds. This is why text indexes grow large.

### Q3: How are typos managed in search?
In basic indexes (Approach B) and regex (Approach A), they are not. In Approach C, engines like Elasticsearch use algorithms like **Levenshtein Distance** (Edit Distance) and **Phonetic Analysis** (converting words to sound codes like `TNSR` for both "dinosaur" and "diinosor") to find typo matches.

### Q4: Does updating indexes on every message increase hosting costs?
Yes. Synchronous index updates increase database write cycles (disk IOPS) and require keeping the index tables in RAM, which increases database hardware costs.
