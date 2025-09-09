
'use server';
import { cloudinary } from './cloudinary-server';
import { Subject, ResourceFile } from './data';

type ExtendedResourceFile = ResourceFile & { publicId: string };

function processCloudinaryResource(resource: any): Subject | null {
    if (!resource.context) return null;

    const context = resource.context.custom || resource.context;
    const subjectName = context.subject;
    
    if (!subjectName) return null;
    
    const subject: Subject = {
        id: subjectName,
        name: subjectName,
        notes: {},
        questionPapers: [],
    };

    const fileData: ExtendedResourceFile = {
        name: context.name || resource.public_id,
        url: resource.secure_url,
        summary: context.summary || '',
        publicId: resource.public_id,
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
    
    // We search by folder now, which is more reliable.
    let folderPath = `resources/${scheme}/${branch}/${semester}`;
    if (subjectName) {
        folderPath += `/${subjectName.trim()}`;
    }

    try {
        // Use folder search instead of context for the main query
        const results = await cloudinary.search
            .expression(`folder:"${folderPath}"`)
            .with_field('context')
            .max_results(500)
            .execute();
        
        const subjectsMap = new Map<string, Subject>();

        for (const resource of results.resources) {
            const parsedSubject = processCloudinaryResource(resource);
            if (!parsedSubject) continue;

            // The subject name from context is the ground truth
            const context = resource.context.custom || resource.context;
            const subjectId = context.subject.trim();
            const existing = subjectsMap.get(subjectId);

            if (existing) {
                // Merge notes
                Object.assign(existing.notes, parsedSubject.notes);

                // Merge question papers, avoiding duplicates
                const existingQpUrls = new Set(existing.questionPapers.map(qp => qp.url));
                parsedSubject.questionPapers.forEach(qp => {
                    if (!existingQpUrls.has(qp.url)) {
                        existing.questionPapers.push(qp);
                    }
                });
            } else {
                // Since parsedSubject has the correct name, we can use it
                subjectsMap.set(subjectId, parsedSubject);
            }
        }
        
        if (subjectName) {
            return subjectsMap.has(subjectName) ? [subjectsMap.get(subjectName)!] : [];
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
         throw new Error('Failed to delete file from Cloudinary.');
    }
}

export async function updateFileContext(publicId: string, context: Record<string, string>): Promise<void> {
    const contextString = Object.entries(context).map(([key, value]) => `${key}=${value}`).join('|');
    await cloudinary.uploader.add_context(contextString, [publicId], { resource_type: 'raw' });
}

export async function updateFileSummary(publicId: string, summary: string): Promise<void> {
    await updateFileContext(publicId, { summary });
}
