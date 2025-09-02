
'use server';
import { cloudinary } from './cloudinary-server';
import { Subject, ResourceFile } from './data';

function processCloudinaryResource(resource: any): Subject | null {
    if (!resource.context) return null;

    const context = resource.context;
    const subjectName = context.subject;

    if (!subjectName) return null;

    const subject: Subject = {
        id: subjectName,
        name: subjectName,
        notes: {},
        questionPapers: [],
    };

    const fileData: ResourceFile = {
        name: context.name,
        url: resource.secure_url,
        summary: context.summary || '',
    };
    
    if (context.resourcetype === 'notes' && context.module) {
        subject.notes[context.module] = fileData;
    } else if (context.resourcetype === 'questionPaper') {
        subject.questionPapers.push(fileData);
    } else {
        return null;
    }
    
    return subject;
}


export async function getFilesForSubject(basePath: string, subjectName?: string): Promise<Subject[]> {
    const contextQueryParts = basePath.split('/').slice(1);
    const [scheme, branch, semester] = contextQueryParts;

    let searchQuery = `resource_type:raw AND context.scheme=${scheme} AND context.branch=${branch} AND context.semester=${semester}`;
    if (subjectName) {
        // Use exact match for subject name search
        searchQuery += ` AND context.subject="${subjectName.trim()}"`;
    }

    try {
        const results = await cloudinary.search
            .expression(searchQuery)
            .with_field('context')
            .max_results(500)
            .execute();
        
        const subjectsMap = new Map<string, Subject>();

        for (const resource of results.resources) {
            const parsedSubject = processCloudinaryResource(resource);
            if (!parsedSubject) continue;

            const subjectId = parsedSubject.name.trim();
            const existing = subjectsMap.get(subjectId);

            if (existing) {
                Object.assign(existing.notes, parsedSubject.notes);
                const existingQpUrls = new Set(existing.questionPapers.map(qp => qp.url));
                parsedSubject.questionPapers.forEach(qp => {
                    if (!existingQpUrls.has(qp.url)) {
                        existing.questionPapers.push(qp);
                    }
                });
            } else {
                subjectsMap.set(subjectId, parsedSubject);
            }
        }
        return Array.from(subjectsMap.values());
    } catch (error) {
        console.error('Error fetching from Cloudinary:', error);
        return [];
    }
}

export async function deleteFileByPath(publicId: string): Promise<void> {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    } catch(error) {
         console.error('Failed to delete file:', error);
         throw error;
    }
}

export async function updateFileContext(publicId: string, context: Record<string, string>): Promise<void> {
    const contextString = Object.entries(context).map(([key, value]) => `${key}=${value}`).join('|');
    await cloudinary.uploader.add_context(contextString, [publicId], { resource_type: 'raw' });
}

export async function updateFileSummary(publicId: string, summary: string): Promise<void> {
    await updateFileContext(publicId, { summary });
}

