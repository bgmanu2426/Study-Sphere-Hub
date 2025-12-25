// Server-side database operations (for API routes)
import { Client, Databases, Query } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const BRANCHES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_BRANCHES_COLLECTION_ID!;
const SUBJECTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_SUBJECTS_COLLECTION_ID!;

function getServerDatabases() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}

export type Branch = {
  $id: string;
  value: string;
  label: string;
  scheme: string;
};

export type DbSubject = {
  $id: string;
  subjectId: string;
  name: string;
  scheme: string;
  branch: string;
  semester: string;
};

// Branch operations
export async function getServerBranches(scheme?: string): Promise<Branch[]> {
  try {
    const databases = getServerDatabases();
    const queries = scheme ? [Query.equal('scheme', scheme)] : [];
    const response = await databases.listDocuments(
      DATABASE_ID,
      BRANCHES_COLLECTION_ID,
      queries
    );
    return response.documents as unknown as Branch[];
  } catch (error: any) {
    if (error?.code === 404 || error?.message?.includes('could not be found')) {
      console.warn('Branches collection not found.');
      return [];
    }
    console.error('Error fetching branches:', error);
    return [];
  }
}

// Subject operations
export async function getServerSubjects(scheme?: string, branch?: string, semester?: string): Promise<DbSubject[]> {
  try {
    const databases = getServerDatabases();
    const queries: any[] = [];
    
    if (scheme) queries.push(Query.equal('scheme', scheme));
    if (branch) queries.push(Query.equal('branch', branch));
    if (semester) queries.push(Query.equal('semester', semester));
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      SUBJECTS_COLLECTION_ID,
      queries
    );
    return response.documents as unknown as DbSubject[];
  } catch (error: any) {
    if (error?.code === 404 || error?.message?.includes('could not be found')) {
      console.warn('Subjects collection not found.');
      return [];
    }
    console.error('Error fetching subjects:', error);
    return [];
  }
}

// Get all subjects (for fetching all resources)
export async function getAllServerSubjects(): Promise<DbSubject[]> {
  try {
    const databases = getServerDatabases();
    const response = await databases.listDocuments(
      DATABASE_ID,
      SUBJECTS_COLLECTION_ID,
      [Query.limit(1000)] // Increase limit for larger datasets
    );
    return response.documents as unknown as DbSubject[];
  } catch (error: any) {
    if (error?.code === 404 || error?.message?.includes('could not be found')) {
      console.warn('Subjects collection not found.');
      return [];
    }
    console.error('Error fetching all subjects:', error);
    return [];
  }
}
