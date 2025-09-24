
'use server';

import { google } from 'googleapis';
import { adminAuth } from './firebase-admin';
import { Subject, ResourceFile } from './data';
import { vtuResources } from './vtu-data';

async function getDriveService(userId: string) {
    const decodedToken = await adminAuth.verifyIdToken(userId);
    // This is a simplification. In a real app, you would use the user's
    // OAuth2 tokens stored during the sign-in flow.
    // For service account auth, you don't need user-specific tokens.
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    return google.drive({ version: 'v3', auth });
}

async function findFolderId(drive: any, parentId: string, folderName: string): Promise<string | null> {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
    const res = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 });
    if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
        return res.data.files[0].id;
    }
    return null;
}

export async function getFilesFromDrive(
    userId: string, 
    filters: { scheme: string, branch: string, semester: string, subject: string | null }
): Promise<Subject[]> {
    const drive = await getDriveService(userId);
    const { scheme, branch, semester, subject } = filters;

    // 1. Find base folder "VTU Assistant"
    const rootFolderId = await findFolderId(drive, 'root', 'VTU Assistant');
    if (!rootFolderId) return [];

    // 2. Navigate to the specific semester folder
    const schemeFolderId = await findFolderId(drive, rootFolderId, scheme);
    if (!schemeFolderId) return [];
    const branchFolderId = await findFolderId(drive, schemeFolderId, branch);
    if (!branchFolderId) return [];
    const semesterFolderId = await findFolderId(drive, branchFolderId, semester);
    if (!semesterFolderId) return [];

    // 3. Get all subject folders within the semester folder
    const subjectFoldersQuery = `mimeType='application/vnd.google-apps.folder' and '${semesterFolderId}' in parents and trashed=false`;
    const subjectFoldersRes = await drive.files.list({ 
        q: subjectFoldersQuery, 
        fields: 'files(id, name)' 
    });

    const staticSubjectsForSemester = vtuResources[scheme as keyof typeof vtuResources]?.[branch as keyof typeof vtuResources]?.[semester as keyof typeof vtuResources] || [];
    const subjectsMap = new Map<string, Subject>();
    
    // Initialize map with static data
    staticSubjectsForSemester.forEach(staticSub => {
        subjectsMap.set(staticSub.name, JSON.parse(JSON.stringify(staticSub)));
    });

    if (subjectFoldersRes.data.files && subjectFoldersRes.data.files.length > 0) {
        for (const subjectFolder of subjectFoldersRes.data.files) {
            if (subject && subjectFolder.name !== subject) continue;
            if (!subjectFolder.id || !subjectFolder.name) continue;

            const subjectName = subjectFolder.name;
            let currentSubject = subjectsMap.get(subjectName);

            if (!currentSubject) {
                currentSubject = { id: subjectFolder.id, name: subjectName, notes: {}, questionPapers: [] };
            }

            // Get all files within this subject folder by traversing resource type folders
            for (const resourceType of ['notes', 'questionPaper']) {
                const resourceTypeFolderId = await findFolderId(drive, subjectFolder.id, resourceType);
                if (!resourceTypeFolderId) continue;
                
                const filesQuery = `'${resourceTypeFolderId}' in parents and trashed=false`;
                const filesRes = await drive.files.list({
                    q: filesQuery,
                    fields: 'files(id, name, webViewLink, appProperties)',
                });

                if (filesRes.data.files) {
                    for (const file of filesRes.data.files) {
                        if (!file.id || !file.name || !file.webViewLink || !file.appProperties) continue;

                        const resourceFile: ResourceFile = {
                            name: file.name,
                            url: file.webViewLink,
                            summary: file.appProperties.summary || ''
                        };

                        if (resourceType === 'notes') {
                            const module = file.appProperties.module;
                            if (module) {
                                currentSubject.notes[module] = resourceFile;
                            }
                        } else if (resourceType === 'questionPaper') {
                            currentSubject.questionPapers.push(resourceFile);
                        }
                    }
                }
            }
             subjectsMap.set(subjectName, currentSubject);
        }
    }
    
    return Array.from(subjectsMap.values());
}
