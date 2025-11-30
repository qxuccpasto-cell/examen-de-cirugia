export type ExamMode = 'CASE' | 'PROCEDURE';

export interface Student {
  name: string;
  id: string;
}

export interface ChecklistItem {
  id: string;
  category: string; // e.g., "Habilidad comunicativa", "Examen físico"
  text: string;
}

export interface CaseData {
  title: string;
  topic: string;
  description: string; // Summary for preview
  chiefComplaint: string; // Motivo de consulta
  currentIllness: string; // Enfermedad actual
  objectives: string[]; // Learning objectives for the preview
  history: string; // Full clinical history OR Procedure Justification Context
  vitalsAndLabs: string; // Signs and tests (Clinical)
  supplies?: string; // NEW: Specific for procedures (List of instruments)
  redFlags: string[];
  simulatedPatientScript?: {
    attitude: string;
    gestures: string;
    phrases: string[];
    allowedInfo: string;
    limitations: string;
  };
  checklist: ChecklistItem[];
  studentInstructions: string; // Added explicitly to type as it was missing in previous definition but used in code
}

export enum PerformanceStatus {
  CORRECT = 'CORRECT',
  PARTIAL = 'PARTIAL',
  INCORRECT = 'INCORRECT',
  NOT_DONE = 'NOT_DONE',
}

export interface ExamState {
  checklistResponses: Record<string, PerformanceStatus>;
  evaluatorNotes: string;
  timeRemaining: number;
}

export interface FeedbackData {
  calculatedScore: number;
  finalScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  justification?: string;
}

export const TOPICS_CASES = [
  "Manejo inicial del paciente politraumatizado",
  "Trauma de cuello y tórax",
  "Trauma craneoencefálico",
  "Trauma de abdomen y pelvis",
  "Trauma raquimedular",
  "Choque hipovolémico",
  "Quemaduras",
  "Abdomen agudo",
  "Apendicitis aguda",
  "Colelitiasis",
  "Colecistitis (clasificar TOKIO)",
  "Coledocolitiasis",
  "Obstrucción intestinal",
  "Hernias de pared abdominal",
  "Pancreatitis aguda de origen biliar",
  "Hemorragia de vías digestivas",
  "Síndrome aórtico agudo",
  "Enfermedad diverticular",
  "Infecciones quirúrgicas"
];

export const TOPICS_PROCEDURES = [
  "Intubación orotraqueal",
  "Suturas (todos los tipos)",
  "Toracostomía",
  "Sonda vesical hombre",
  "Sonda vesical mujer",
  "Sonda nasogástrica"
];