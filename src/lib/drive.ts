
'use server';

import { google } from 'googleapis';
import { adminAuth } from './firebase-admin';
import { Subject, ResourceFile } from './data';
import { vtuResources } from './vtu-data';

async function getDriveService() {
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
    const drive = await getDriveService();
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

    if (!subjectFoldersRes.data.files) return [];

    const subjectsMap = new Map<string, Subject>();
    
    // Get static data for merging later
    const staticSubjectsForSemester = vtuResources[scheme as keyof typeof vtuResources]?.[branch as keyof typeof vtuResources]?.[semester as keyof typeof vtuResources] || [];

    for (const subjectFolder of subjectFoldersRes.data.files) {
        if (subject && subjectFolder.name !== subject) continue;

        const subjectName = subjectFolder.name;
        const subjectId = subjectFolder.id;
        
        if (!subjectId || !subjectName) continue;

        // Initialize subject from static data if available
        const staticSubjectData = staticSubjectsForSemester.find(s => s.name === subjectName);
        const newSubject: Subject = staticSubjectData 
            ? JSON.parse(JSON.stringify(staticSubjectData))
            : { id: subjectId, name: subjectName, notes: {}, questionPapers: [] };
        
        // Get all files within this subject folder
        const filesQuery = `'${subjectId}' in parents and trashed=false`;
        const filesRes = await drive.files.list({
            q: filesQuery,
            fields: 'files(id, name, webViewLink, appProperties)',
        });
        
        if (!filesRes.data.files) continue;

        for (const file of filesRes.data.files) {
            if (!file.id || !file.name || !file.webViewLink || !file.appProperties) continue;

            const resourceFile: ResourceFile = {
                name: file.name,
                url: file.webViewLink,
                summary: file.appProperties.summary || ''
            };

            const resourceType = file.appProperties.resourceType;
            if (resourceType === 'notes') {
                const module = file.appProperties.module;
                if (module) {
                    newSubject.notes[module] = resourceFile;
                }
            } else if (resourceType === 'questionPaper') {
                newSubject.questionPapers.push(resourceFile);
            }
        }
        subjectsMap.set(subjectName, newSubject);
    }
    
    // Add static subjects that didn't have dynamic content
     staticSubjectsForSemester.forEach(staticSub => {
        if (!subjectsMap.has(staticSub.name)) {
            subjectsMap.set(staticSub.name, staticSub);
        }
    });

    return Array.from(subjectsMap.values());
}
