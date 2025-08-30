
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getStorage, ref, listAll, getDownloadURL, getMetadata, updateMetadata, ListResult, StorageReference, getBytes, deleteObject } from "firebase/storage";
import { Subject, ResourceFile } from "./data";

const firebaseConfig = {
  apiKey: "AIzaSyAWfHPsEOU50o5oLLNKF0YycHlyNF6gjKA",
  authDomain: "vtu-assistant-rkmf1.firebaseapp.com",
  projectId: "vtu-assistant-rkmf1",
  storageBucket: "vtu-assistant-rkmf1.appspot.com",
  messagingSenderId: "998939257663",
  appId: "1:998939257663:web:1b33f669b722eaa991c18a",
};


let firebaseApp: FirebaseApp;
if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
} else {
    firebaseApp = getApp();
}

async function processFile(fileRef: StorageReference): Promise<ResourceFile> {
    const url = await getDownloadURL(fileRef);
    let summary: string | undefined = undefined;
    try {
        const metadata = await getMetadata(fileRef);
        summary = metadata.customMetadata?.summary;
    } catch(e) {
        // No metadata or summary found
    }
    return { name: fileRef.name, url, summary };
}

async function processSubjectFolder(subjectFolder: StorageReference): Promise<Subject> {
    const subjectName = subjectFolder.name;
    const notes: { [module: string]: ResourceFile } = {};
    const questionPapers: ResourceFile[] = [];

    const notesFolderRef = ref(subjectFolder.storage, `${subjectFolder.fullPath}/notes`);
    try {
        const noteModuleFolders = await listAll(notesFolderRef);
        for (const moduleFolder of noteModuleFolders.prefixes) {
            const moduleFiles = await listAll(moduleFolder);
            if (moduleFiles.items.length > 0) {
                // Assuming one file per module folder for simplicity in this structure
                const fileRef = moduleFiles.items[0];
                const fileData = await processFile(fileRef);
                notes[moduleFolder.name] = fileData;
            }
        }
    } catch (e) {
        // notes folder might not exist, which is fine
    }

    const qpFolderRef = ref(subjectFolder.storage, `${subjectFolder.fullPath}/questionPapers`);
    try {
        const qpFiles = await listAll(qpFolderRef);
        for (const fileRef of qpFiles.items) {
            const fileData = await processFile(fileRef);
            questionPapers.push(fileData);
        }
    } catch (e) {
        // qp folder might not exist, which is fine
    }

    return {
      id: subjectName, // Use folder name as ID
      name: subjectName,
      notes,
      questionPapers,
    };
}


export async function getFilesForSubject(path: string, subjectName?: string): Promise<Subject[]> {
  if (!firebaseApp) {
    console.error("Firebase not initialized");
    return [];
  }
  const storage = getStorage(firebaseApp);

  if (subjectName) {
      // Fetch a single subject
      const subjectFolderRef = ref(storage, `${path}/${subjectName}`);
      try {
          const subject = await processSubjectFolder(subjectFolderRef);
          return [subject];
      } catch (error) {
          console.log(`No specific subject folder found for "${subjectName}", returning empty.`);
          return [];
      }
  } else {
      // Fetch all subjects in the path
      const subjectFoldersRef = ref(storage, path);
      const subjectFoldersList = await listAll(subjectFoldersRef);
      
      const subjectPromises = subjectFoldersList.prefixes.map(processSubjectFolder);
      const subjects = await Promise.all(subjectPromises);
      return subjects;
  }
}

export async function getFileAsBuffer(filePath: string): Promise<Buffer> {
    const storage = getStorage(firebaseApp);
    const fileRef = ref(storage, filePath);
    const bytes = await getBytes(fileRef);
    return Buffer.from(bytes);
}

export async function updateFileSummary(filePath: string, summary: string): Promise<void> {
    const storage = getStorage(firebaseApp);
    const fileRef = ref(storage, filePath);
    await updateMetadata(fileRef, { customMetadata: { summary } });
}

export async function deleteFileByPath(filePath: string): Promise<void> {
    const storage = getStorage(firebaseApp);
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
}

// Export the initialized app, or a placeholder if not initialized
export { firebaseApp };
