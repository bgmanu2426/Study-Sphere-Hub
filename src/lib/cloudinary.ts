
'use server';
import { cloudinary } from './cloudinary-server';
import { Subject, ResourceFile } from './data';

async function processCloudinaryResource(resource: any): Promise<[string, string, ResourceFile] | null> {
    const pathParts = resource.public_id.split('/');
    if (pathParts.length < 6) return null; // e.g., resources/scheme/branch/sem/subject/type/file

    const subjectName = pathParts[4];
    const resourceType = pathParts[5];
    const fileName = pathParts.slice(6).join('/');

    const fileData: ResourceFile = {
        name: fileName,
        url: resource.secure_url,
        summary: resource.context?.custom?.summary,
    };
    
    return [subjectName, resourceType, fileData];
}

export async function getFilesForSubject(basePath: string, subjectName?: string): Promise<Subject[]> {
    const expression = `folder=${basePath}${subjectName ? `/${subjectName}` : ''}*`;

    try {
        const results = await cloudinary.search.expression(expression).with_field('context').execute();
        
        const subjectsMap = new Map<string, Subject>();

        for (const resource of results.resources) {
            const processed = await processCloudinaryResource(resource);
            if (!processed) continue;

            const [currentSubjectName, resourceType, fileData] = processed;

            if (!subjectsMap.has(currentSubjectName)) {
                subjectsMap.set(currentSubjectName, {
                    id: currentSubjectName,
                    name: currentSubjectName,
                    notes: {},
                    questionPapers: [],
                });
            }

            const subject = subjectsMap.get(currentSubjectName)!;

            if (resourceType === 'notes') {
                const moduleName = resource.public_id.split('/')[6];
                subject.notes[moduleName] = fileData;
            } else if (resourceType === 'questionPapers') {
                subject.questionPapers.push(fileData);
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
         await cloudinary.uploader.destroy(publicId);
    }
}

export async function updateFileSummary(publicId: string, summary: string): Promise<void> {
    await cloudinary.uploader.add_context('summary', summary, [publicId]);
}
