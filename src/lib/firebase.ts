
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getStorage, ref, getBytes, updateMetadata } from "firebase/storage";
import { getFilesForSubject, deleteFileByPath } from './cloudinary'; // Import Cloudinary functions

// Correct and verified Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


let firebaseApp: FirebaseApp;
if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
} else {
    firebaseApp = getApp();
}

// These functions are now delegated to Cloudinary and are kept for compatibility if needed elsewhere,
// but the primary resource fetching logic now uses Cloudinary.
// We can remove them fully later if they are confirmed to be unused.

async function getFileAsBuffer(filePath: string): Promise<Buffer> {
    // This function might still be needed for other purposes, but not for resource display
    const storage = getStorage(firebaseApp);
    const fileRef = ref(storage, filePath);
    const bytes = await getBytes(fileRef);
    return Buffer.from(bytes);
}

async function updateFileSummary(filePath: string, summary: string): Promise<void> {
    const storage = getStorage(firebaseApp);
    const fileRef = ref(storage, filePath);
    await updateMetadata(fileRef, { customMetadata: { summary } });
}


// Export the initialized app, or a placeholder if not initialized
export { firebaseApp, getFilesForSubject, deleteFileByPath, getFileAsBuffer, updateFileSummary };


