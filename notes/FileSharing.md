# File Sharing: Buffering, Streaming & Direct Uploads

Here is a breakdown of the differences between standard file buffering, upload streaming, and direct uploads.

---

### 1. Movie Analogy: Downloading vs. Streaming
Imagine you want to watch a 2-hour movie on your computer:
* **The "Downloading" (Buffering) Way**: You click download. You must wait for the entire 2GB file to finish downloading to your hard drive. Once it is 100% finished, you can finally open and play the video.
* **The "Streaming" (YouTube/Netflix) Way**: You click play. You start watching the first 5 seconds immediately. The player loads the next 5 seconds in the background as you watch. You do not need to wait for the whole movie to download, and your computer doesn't need to load the entire 2GB file into memory at once.

---

### 2. Production Upload Architectures (Scale Levels)

As web applications grow, the way files are transferred must evolve to protect server RAM, CPU, and bandwidth. Here are the three primary levels:

#### Level 1: Buffer Uploading (Small Scale)
* **Flow:** Client Upload ──> Server RAM (Buffer) ──> Cloud Storage (Cloudinary/S3).
* **How it works:** The server downloads the entire file from the browser, stores it in RAM (`req.file.buffer`), and then uploads it to the cloud.
* **Verdict:** Easiest to write, works perfectly for small uploads (< 15MB). However, if 10 users upload 100MB files at once, your server needs 1GB of RAM just to hold these files temporarily, which can crash small servers.

#### Level 2: Upload Streaming (Medium Scale)
* **Flow:** Client Upload ──> Server Stream Pipe ──> Cloud Storage.
* **How it works:** As soon as the server receives the first tiny chunk (e.g., 16KB) from the browser, it immediately forwards (pipes) that chunk to the cloud. The server acts like a water pipe; the file is never fully held in the server's RAM.
* **Verdict:** Highly RAM-efficient (only uses 16KB of RAM regardless of file size), but still consumes the server's CPU and internet network bandwidth.

#### Level 3: Direct Client Upload via Signed Parameters (High Scale / Enterprise)
* **Flow:** Client ──[ Request Signature ]──> Server (Local Hashing) ──[ Return Signature ]──> Client ──[ Direct Upload with Signature ]──> Cloud Storage.
* **How it works:**
  1. The client requests upload authorization from the backend.
  2. The backend signs the upload parameters (folder, timestamp) locally using the private **API Secret** (completely offline, without contacting Cloudinary's servers).
  3. The client uploads the file directly to Cloudinary, sending the file, the signature, and the public **API Key**.
  4. Cloudinary uses the shared **API Secret** to verify the signature on its side. If valid, the file is saved and a secure URL is returned.
* **Verdict:** The gold standard for production. The backend server uses **0 RAM, 0 CPU, and 0 network bandwidth** for the file transfer.

```mermaid
sequenceDiagram
    autonumber
    participant Client as Frontend (Client Browser)
    participant Server as Backend Server (Node/Express)
    participant Cloudinary as Cloudinary Servers

    Note over Server: Shares Private API Secret
    Note over Cloudinary: Shares Private API Secret

    Client->>Server: 1. Requests Signature (GET /upload-signature)
    Note over Server: Calculates signature locally using API Secret (Offline Hashing)
    Server-->>Client: 2. Sends public API Key, timestamp, and signature
    
    Client->>Cloudinary: 3. Direct POST /upload (File + API Key + timestamp + signature)
    Note over Cloudinary: Recalculates signature using API Secret to verify authenticity
    
    alt Signature is Valid
        Cloudinary-->>Client: 4. Upload Approved & secure_url returned
    else Signature is Altered/Invalid
        Cloudinary-->>Client: 4. Upload Blocked (401 Unauthorized)
    end
```

> [!TIP]
> **Active Implementation:** Our ChatApp currently implements **Level 3 (Direct Client Upload via Signed Parameters)**. The frontend fetches a cryptographic signature from `/api/chat/upload-signature` and uploads media directly to Cloudinary, completely bypassing our backend server.

---

### 3. How Level 3 Signature Verification Works (Summary)

* The cryptographic **Signature** which our backend made (and sent to the frontend) secretly factors in our private **API Secret Key** inside a secure hash.
* When this signature is sent to Cloudinary, Cloudinary **remakes the signature** locally on its end because it also possesses our secret key.
* Cloudinary compares its remade signature with the one in our request: if they match and are valid, Cloudinary saves the file and returns the secure URL.

---

### 4. What is Multer's role?
* **Multer** is a library that runs on your backend server. It acts as a multipart form data parser.
* In Level 1 and Level 2, Multer reads the incoming request stream, extracts the text fields and file chunks, and helps you handle them (saving to disk, keeping in RAM buffer, or streaming elsewhere).
* *Note: In Level 3 direct uploads, we do not need Multer on our chat routes at all, as the server never parses or receives the binary files.*

---


### 5. Cloudinary vs. AWS S3
For a chat application, we use both Cloudinary and S3 depending on the file type:
* **Cloudinary**: Best for profile avatars, chat images, and voice notes. It automatically compresses and optimizes media files, and supports dynamic transformations.
* **AWS S3**: Best for raw document attachments (PDFs, ZIPs, Word docs) where optimization is unnecessary.

---

### 5. Code Cheat Sheet

#### Cloudinary Stream Upload
```javascript
import { v2 as cloudinary } from 'cloudinary'

const uploadToCloudinary = (fileStream, folderName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: folderName, resource_type: 'auto' },
      (error, result) => {
        if (error) {
          reject(error)
          return
        }
        resolve(result)
      }
    )
    fileStream.pipe(uploadStream)
  })
}
```

#### AWS S3 Multipart Stream Upload (AWS SDK v3)
```javascript
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})

const uploadToS3 = async (fileStream, key, mimeType) => {
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: mimeType
    }
  })
  return await upload.done()
}
```

#### Axios Frontend Upload Progress (React)
```javascript
import axios from 'axios'

const uploadFileWithProgress = async (file, onProgressUpdate) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await axios.post('/api/upload', formData, {
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgressUpdate(percentCompleted)
      }
    }
  })
  return response.data
}
```

#### Native XMLHttpRequest Upload Progress & Cancellation (React)
When you want to avoid adding a heavy third-party library like Axios to your project, you can use the browser's native `XMLHttpRequest` (XHR) API. It offers built-in support for progress tracking and aborting (cancelling) active transfers.

```javascript
const uploadFileWithXHR = (file, onProgressUpdate, abortSignal) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    xhr.open('POST', '/api/upload')

    // 1. Monitor progress via the upload object
    if (xhr.upload && onProgressUpdate) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded * 100) / event.total)
          onProgressUpdate(percent)
        }
      }
    }

    // 2. Setup cancellation listener (via AbortSignal)
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        xhr.abort()
        reject(new DOMException('Upload aborted by user', 'AbortError'))
      })
    }

    // 3. Handle success and error statuses
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))

    // 4. Send the request payload
    xhr.send(formData)
  })
}
```

