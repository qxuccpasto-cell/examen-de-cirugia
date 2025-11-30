import { GoogleGenAI, Type } from "@google/genai";
import { CaseData, ChecklistItem, PerformanceStatus, FeedbackData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the response schema for Case Generation
const checklistItemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    category: { type: Type.STRING },
    text: { type: Type.STRING },
  },
  required: ["id", "category", "text"]
};

const simulatedPatientSchema = {
  type: Type.OBJECT,
  properties: {
    attitude: { type: Type.STRING },
    gestures: { type: Type.STRING },
    phrases: { type: Type.ARRAY, items: { type: Type.STRING } },
    allowedInfo: { type: Type.STRING },
    limitations: { type: Type.STRING },
  },
  required: ["attitude", "gestures", "phrases", "allowedInfo", "limitations"]
};

const caseGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    chiefComplaint: { type: Type.STRING, description: "Motivo de consulta o Indicación del procedimiento" },
    currentIllness: { type: Type.STRING, description: "Enfermedad actual o Justificación Clínica breve" },
    studentInstructions: { type: Type.STRING, description: "Instrucciones directas para el estudiante (Rol, escenario y tiempo límite)" },
    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    history: { type: Type.STRING, description: "Historia completa o Contexto del procedimiento" },
    vitalsAndLabs: { type: Type.STRING, description: "Signos vitales/Labs (Caso) o Dejar vacío si es procedimiento" },
    supplies: { type: Type.STRING, description: "Lista de insumos requeridos (Solo para procedimientos)" },
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    simulatedPatientScript: simulatedPatientSchema,
    checklist: { type: Type.ARRAY, items: checklistItemSchema }
  },
  required: ["title", "description", "chiefComplaint", "currentIllness", "studentInstructions", "objectives", "history", "checklist", "redFlags"]
};

// Define schema for Feedback Generation
const feedbackSchema = {
  type: Type.OBJECT,
  properties: {
    calculatedScore: { type: Type.NUMBER, description: "Score from 0.0 to 5.0" },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["calculatedScore", "strengths", "weaknesses", "recommendations"]
};

export const generateCase = async (topic: string, isProcedure: boolean, usePatient: boolean): Promise<CaseData> => {
  const modelId = "gemini-2.5-flash"; 
  
  // --- PROMPT FOR CLINICAL CASES ---
  const clinicalSystemPrompt = `
    Actúa como un experto docente de Cirugía en una facultad de medicina de **Colombia**.
    Diseña una estación de ECOE (OSCE) de **CORTE CLÍNICO** (Diagnóstico y Manejo).
    
    Contexto: Sistema de Salud Colombiano.
    Objetivo: Evaluar razonamiento clínico, anamnesis, diagnóstico y plan de manejo.
    
    La lista de chequeo debe cubrir:
    - Habilidad comunicativa.
    - Anamnesis y Examen físico.
    - Razonamiento diagnóstico.
    - Manejo médico inicial y Remisión.
  `;

  // --- PROMPT FOR PROCEDURES ---
  const procedureSystemPrompt = `
    Actúa como un experto instructor de Cirugía y Simulación Clínica en **Colombia**.
    Diseña una estación de ECOE (OSCE) de **CORTE TÉCNICO / PROCEDIMENTAL**.
    
    OBJETIVO: Evaluar EXCLUSIVAMENTE la destreza técnica, la bioseguridad y la seguridad del paciente durante el procedimiento: "${topic}".
    NO generes una historia clínica compleja ni interrogatorio extenso. El foco es la MANIOBRA.

    La lista de chequeo debe ser secuencial y técnica (Pasos críticos):
    1. Preparación y Bioseguridad (EPP, Lavado, Técnica estéril).
    2. Insumos y Anestesia (si aplica).
    3. Técnica del Procedimiento (Paso a paso de la maniobra).
    4. Cierre / Fijación / Comprobación.
    5. Disposición de desechos.
    
    En el campo 'supplies' lista: Guantes, suturas específicas, lidocaína, hoja de bisturí, sondas, etc.
    En 'history' solo pon una justificación breve de por qué se requiere el procedimiento (ej: "Paciente con herida de 5cm...").
  `;

  const commonUserPrompt = `
    Tema: ${topic}
    Tipo: ${isProcedure ? 'PROCEDIMIENTO TÉCNICO' : 'CASO CLÍNICO'}
    Incluye Paciente Simulado: ${usePatient ? 'Sí (con jerga colombiana)' : 'No (Maniquí/Simulador)'}
    Idioma: Español (Colombia).
    
    INSTRUCCIONES ESPECÍFICAS DE CAMPOS:
    - 'studentInstructions': 
      * Redacta un texto claro para leerle al estudiante.
      * Estructura: "Usted se encuentra en [Escenario]. Su paciente presenta [Breve problema]. Su tarea es REALIZAR [Acción]."
      * OBLIGATORIO: Finaliza con "Cuenta con 7 minutos para realizar la atención."
      * PROHIBIDO: No menciones bibliografía en este texto.
    
    ${isProcedure ? 
      `- 'chiefComplaint': Indicación del procedimiento (ej: "Herida en antebrazo").
       - 'currentIllness': Contexto técnico breve.
       - 'vitalsAndLabs': DEJA ESTE CAMPO VACÍO O CON "N/A".
       - 'supplies': LISTA DETALLADA de equipos necesarios (Pinzas, suturas, jeringas, etc.).
       - 'checklist': Ítems puramente técnicos (ej: "Verifica permeabilidad", "Realiza nudo cuadrado", "No cruza manos").` 
      : 
      `- 'chiefComplaint': Motivo de consulta (coloquial si hay paciente).
       - 'vitalsAndLabs': Signos vitales y laboratorios completos.`
    }
  `;

  const selectedSystemPrompt = isProcedure ? procedureSystemPrompt : clinicalSystemPrompt;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: selectedSystemPrompt + "\n" + commonUserPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: caseGenerationSchema,
        temperature: 0.6, // Lower temperature for procedures to be more precise
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as CaseData;
      data.topic = topic;
      return data;
    }
    throw new Error("No data returned from AI");
  } catch (error) {
    console.error("Error generating case:", error);
    throw error;
  }
};

export const generateFeedback = async (
  caseData: CaseData,
  responses: Record<string, PerformanceStatus>,
  notes: string
): Promise<FeedbackData> => {
  const modelId = "gemini-2.5-flash";

  const totalItems = caseData.checklist.length;
  let rawScore = 0;
  
  const formattedResponses = caseData.checklist.map(item => {
    const status = responses[item.id] || PerformanceStatus.NOT_DONE;
    let val = 0;
    if (status === PerformanceStatus.CORRECT) val = 1;
    if (status === PerformanceStatus.PARTIAL) val = 0.5;
    rawScore += val;
    return `- ${item.category}: ${item.text} -> ${status}`;
  }).join("\n");

  const computedMathScore = (rawScore / totalItems) * 5;

  const systemPrompt = `
    Eres un docente universitario de cirugía en Colombia. Evalúa el desempeño del estudiante en la estación ECOE.
    
    Contexto: ${caseData.supplies ? "PROCEDIMIENTO TÉCNICO (Destreza manual, asepsia, seguridad)" : "CASO CLÍNICO (Razonamiento, diagnóstico)"}.
    
    Rúbrica (Escala 0.0 a 5.0):
    - 0.0-2.9: Insuficiente (Errores críticos de seguridad/asepsia o desconocimiento técnico).
    - 3.0-3.9: Aceptable.
    - 4.0-4.5: Bueno.
    - 4.6-5.0: Excelente.

    Genera retroalimentación:
    1. Aspectos logrados.
    2. Aspectos por mejorar (Sé muy específico en técnica si es procedimiento).
    3. Recomendaciones (Basadas en ATLS/Técnica Quirúrgica).
  `;

  const userPrompt = `
    Caso/Procedimiento: ${caseData.title}
    Nota Matemática: ${computedMathScore.toFixed(2)}
    
    Desempeño:
    ${formattedResponses}
    
    Notas del Evaluador:
    ${notes}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\n" + userPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: feedbackSchema,
        temperature: 0.5,
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text) as FeedbackData;
      data.finalScore = data.calculatedScore; 
      return data;
    }
    throw new Error("No feedback returned");
  } catch (error) {
    console.error("Feedback generation failed", error);
    return {
        calculatedScore: computedMathScore,
        finalScore: computedMathScore,
        strengths: ["No se pudo generar análisis AI."],
        weaknesses: ["Verificar conexión."],
        recommendations: ["Revisar guías estándar."],
    };
  }
};