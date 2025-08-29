
export type ResourceFile = {
  name: string;
  url: string;
  summary?: string;
}

export type Subject = {
  id: string; // usually the folder name
  name: string;
  notes: { [module: string]: ResourceFile };
  questionPapers: ResourceFile[];
};


export const schemes = [
  { value: '2022', label: '2022 Scheme' },
  { value: '2021', label: '2021 Scheme' },
];

export const branches = [
  { value: 'cse', label: 'Computer Science' },
  { value: 'ise', label: 'Information Science' },
  { value: 'ece', label: 'Electronics & Communication' },
  { value: 'me', label: 'Mechanical Engineering' },
  { value: 'cv', label: 'Civil Engineering' },
];

export const years = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

export const semesters = [
  { value: '1', label: '1st Sem' },
  { value: '2', label: '2nd Sem' },
  { value: '3', label: '3rd Sem' },
  { value: '4', label: '4th Sem' },
  { value: '5', label: '5th Sem' },
  { value: '6', label: '6th Sem' },
  { value: '7', label: '7th Sem' },
  { value: '8', label: '8th Sem' },
];

export const cycles = [
  { value: '1', label: 'P & C Cycle' },
];

type Resources = {
  [scheme: string]: {
    [branch: string]: {
      [semester: string]: any[]; // This is now dynamic
    };
  };
};

// Mock data is no longer needed as we fetch dynamically.
export const resources: Resources = {};
