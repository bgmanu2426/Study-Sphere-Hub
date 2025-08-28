import { vtuResources } from './vtu-data';

export type Subject = {
  id: string;
  name: string;
  notes: {
    module1: string;
    module2: string;
    module3: string;
    module4: string;
    module5: string;
  };
  questionPapers: {
    current: string;
    previous: string;
  };
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

type Resources = {
  [scheme: string]: {
    [branch: string]: {
      [semester: string]: Subject[];
    };
  };
};

// Mock data - in a real app this would come from a database
export const resources: Resources = vtuResources;
