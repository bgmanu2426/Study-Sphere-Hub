
'use server';

import { Subject, ResourceFile } from './data';
import { vtuResources } from './vtu-data';

const TEABLE_API_TOKEN = process.env.NEXT_PUBLIC_TEABLE_API_TOKEN;
const TEABLE_TABLE_ID = process.env.NEXT_PUBLIC_TEABLE_TABLE_ID;
const BASE_URL = `https://app.teable.ai/api/table/${TEABLE_TABLE_ID}/record`;

async function teableRequest(url: string, options: RequestInit = {}) {
  if (!TEABLE_API_TOKEN || !TEABLE_TABLE_ID) {
    throw new Error('Teable API token or Table ID is not configured.');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEABLE_API_TOKEN}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Teable API Error:", errorBody);
    throw new Error(errorBody.message || 'An error occurred with the Teable API.');
  }

  return response.json();
}

export async function getResourcesFromTeable(
  filters: { scheme: string, branch: string, semester: string, subject: string | null }
): Promise<Subject[]> {
  const { scheme, branch, semester } = filters;

  // 1. Fetch dynamic resources from Teable
  const filterConditions = [
    { field: 'Scheme', value: scheme, operator: 'is' },
    { field: 'Branch', value: branch, operator: 'is' },
    { field: 'Semester', value: semester, operator: 'is' },
  ];

  const filter = {
    where: {
      and: filterConditions,
    },
  };

  const url = `${BASE_URL}?filter=${encodeURIComponent(JSON.stringify(filter))}`;
  const teableData = await teableRequest(url, { method: 'GET' });

  // 2. Get static resources for the selected criteria
  const staticSubjectsForSemester = vtuResources[scheme as keyof typeof vtuResources]?.[branch as keyof typeof vtuResources]?.[semester as keyof typeof vtuResources] || [];

  // 3. Merge static and dynamic data
  const subjectsMap = new Map<string, Subject>();

  // Initialize map with a deep copy of static data
  staticSubjectsForSemester.forEach(staticSub => {
    subjectsMap.set(staticSub.id, JSON.parse(JSON.stringify(staticSub)));
  });

  // Merge Teable records into the map
  if (teableData && teableData.records) {
    for (const record of teableData.records) {
      const fields = record.fields;
      const subjectCode = fields['Subject Code'];
      const subjectName = fields['Subject Name'];

      if (!subjectCode || !subjectName) continue;

      let subject = subjectsMap.get(subjectCode);
      if (!subject) {
        subject = { id: subjectCode, name: subjectName, notes: {}, questionPapers: [] };
      }

      const resourceFile: ResourceFile = {
        name: fields['File Name'],
        url: fields['URL'],
        summary: fields['Summary'] || '',
      };

      if (fields['Resource Type'] === 'Notes') {
        const moduleKey = (fields['Module'] || 'module-unknown').toLowerCase().replace(' ', '');
        subject.notes[moduleKey] = resourceFile;
      } else if (fields['Resource Type'] === 'Question Paper') {
        subject.questionPapers.push(resourceFile);
      }
      
      subjectsMap.set(subjectCode, subject);
    }
  }

  return Array.from(subjectsMap.values());
}

export async function createResourceInTeable(payload: any) {
    const result = await teableRequest(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return result;
}
