'use client';

import { 
  databases, 
  DATABASE_ID, 
  BRANCHES_COLLECTION_ID, 
  SUBJECTS_COLLECTION_ID, 
  ID, 
  Query 
} from './appwrite';

export type Branch = {
  $id: string;
  value: string;
  label: string;
  scheme: string;
};

export type Subject = {
  $id: string;
  subjectId: string;
  name: string;
  scheme: string;
  branch: string;
  semester: string;
};

// Branch operations
export async function getBranches(scheme?: string): Promise<Branch[]> {
  try {
    const queries = scheme ? [Query.equal('scheme', scheme)] : [];
    const response = await databases.listDocuments(
      DATABASE_ID,
      BRANCHES_COLLECTION_ID,
      queries
    );
    return response.documents as unknown as Branch[];
  } catch (error: any) {
    // If collection doesn't exist, return empty array silently
    if (error?.code === 404 || error?.message?.includes('could not be found')) {
      console.warn('Branches collection not found. Please create it in Appwrite Console.');
      return [];
    }
    console.error('Error fetching branches:', error);
    return [];
  }
}

export async function addBranch(value: string, label: string, scheme: string): Promise<Branch | null> {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      BRANCHES_COLLECTION_ID,
      ID.unique(),
      {
        value: value.toLowerCase().replace(/\s+/g, '-'),
        label,
        scheme,
      }
    );
    return response as unknown as Branch;
  } catch (error) {
    console.error('Error adding branch:', error);
    throw error;
  }
}

// Subject operations
export async function getSubjects(scheme: string, branch: string, semester: string): Promise<Subject[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      SUBJECTS_COLLECTION_ID,
      [
        Query.equal('scheme', scheme),
        Query.equal('branch', branch),
        Query.equal('semester', semester),
      ]
    );
    return response.documents as unknown as Subject[];
  } catch (error: any) {
    // If collection doesn't exist, return empty array silently
    if (error?.code === 404 || error?.message?.includes('could not be found')) {
      console.warn('Subjects collection not found. Please create it in Appwrite Console.');
      return [];
    }
    console.error('Error fetching subjects:', error);
    return [];
  }
}

export async function addSubject(
  subjectId: string, 
  name: string, 
  scheme: string, 
  branch: string, 
  semester: string
): Promise<Subject | null> {
  try {
    const response = await databases.createDocument(
      DATABASE_ID,
      SUBJECTS_COLLECTION_ID,
      ID.unique(),
      {
        subjectId,
        name,
        scheme,
        branch,
        semester,
      }
    );
    return response as unknown as Subject;
  } catch (error) {
    console.error('Error adding subject:', error);
    throw error;
  }
}
