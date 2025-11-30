import React, { useState, useEffect, useRef } from 'react';
import { 
  User, FileText, Activity, CheckCircle, XCircle, AlertCircle, 
  HelpCircle, ChevronRight, Save, Download, RefreshCw, Stethoscope, Play,
  Target, PenTool, Megaphone, Syringe, Scissors
} from 'lucide-react';
import { 
  Student, ExamMode, CaseData, PerformanceStatus, FeedbackData, 
  TOPICS_CASES, TOPICS_PROCEDURES 
} from './types';
import { generateCase, generateFeedback } from './services/geminiService';
import { generatePDF } from './utils/pdfGenerator';
import Timer from './components/Timer';

// --- STAGES ENUM ---
enum AppStage {
  LOGIN,
  MODE_SELECTION,
  TOPIC_SELECTION,
  GENERATING,
  PREVIEW,
  EXAM_RUNNING,
  FEEDBACK_GENERATION,
  RESULTS
}

const App: React.FC = () => {
  // --- STATE ---
  const [stage, setStage] = useState<AppStage>(AppStage.LOGIN);
  const [student, setStudent] = useState<Student>({ name: '', id: '' });
  const [examMode, setExamMode] = useState<ExamMode>('CASE');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [useSimulatedPatient, setUseSimulatedPatient] = useState<boolean>(false);
  
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Exam execution state
  const [timeRemaining, setTimeRemaining] = useState(480); // 8 minutes
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [responses, setResponses] = useState<Record<string, PerformanceStatus>>({});
  const [evaluatorNotes, setEvaluatorNotes] = useState('');
  
  // Results state
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [finalScoreOverride, setFinalScoreOverride] = useState<string>('');
  const [scoreJustification, setScoreJustification] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('');
  
  // Refs
  const notesEndRef = useRef<HTMLDivElement>(null);

  // --- HANDLERS ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (student.name && student.id) setStage(AppStage.MODE_SELECTION);
  };

  const handleModeSelect = (mode: ExamMode) => {
    setExamMode(mode);
    setStage(AppStage.TOPIC_SELECTION);
  };

  const handleTopicSelect = async (topic: string) => {
    setSelectedTopic(topic);
    setStage(AppStage.GENERATING);
    setLoadingError(null);
    try {
      const data = await generateCase(topic, examMode === 'PROCEDURE', useSimulatedPatient);
      setCaseData(data);
      setStage(AppStage.PREVIEW);
    } catch (err) {
      setLoadingError("Error generando el caso. Por favor intente de nuevo o verifique su conexión/API Key.");
      setStage(AppStage.TOPIC_SELECTION);
    }
  };

  const startExam = () => {
    setTimeRemaining(480); // Reset to 8 mins
    setResponses({});
    setEvaluatorNotes('');
    setIsTimerActive(true);
    setStage(AppStage.EXAM_RUNNING);
  };

  const handleChecklistChange = (itemId: string, status: PerformanceStatus) => {
    setResponses(prev => ({ ...prev, [itemId]: status }));
  };

  const finishExam = async () => {
    setIsTimerActive(false);
    setStage(AppStage.FEEDBACK_GENERATION);
    if (caseData) {
      try {
        const result = await generateFeedback(caseData, responses, evaluatorNotes);
        setFeedback(result);
        setFinalScoreOverride(result.calculatedScore.toFixed(1));
        setStage(AppStage.RESULTS);
      } catch (err) {
        setLoadingError("Error generando retroalimentación.");
      }
    }
  };

  const handleDownloadPDF = () => {
    if (!evaluatorName.trim()) {
        alert("Por favor ingrese el nombre del docente evaluador para firmar el reporte.");
        return;
    }
    if (student && caseData && feedback) {
        // Update final score based on override
        const updatedFeedback = {
            ...feedback,
            finalScore: parseFloat(finalScoreOverride),
            justification: scoreJustification
        };
        generatePDF(student, caseData, updatedFeedback, responses, evaluatorNotes, evaluatorName);
    }
  };

  // --- RENDER HELPERS ---

  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-4 relative">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6 text-teal-600">
           <Stethoscope size={48} />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2 text-slate-800">SurgiEval AI</h1>
        <p className="text-center text-slate-500 mb-6">Evaluación Clínica Quirúrgica (OSCE/ECOE)</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre del Estudiante</label>
            <input 
              required
              type="text" 
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm border p-2 focus:ring-teal-500 focus:border-teal-500"
              value={student.name}
              onChange={e => setStudent({...student, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Cédula de Ciudadanía / Documento</label>
            <input 
              required
              type="text" 
              placeholder="Ej: 1098..."
              className="mt-1 block w-full rounded-md border-slate-300 shadow-sm border p-2 focus:ring-teal-500 focus:border-teal-500"
              value={student.id}
              onChange={e => setStudent({...student, id: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 font-semibold transition">
            Ingresar a la Plataforma
          </button>
        </form>
      </div>
      <div className="absolute bottom-4 text-center">
         <p className="text-xs text-slate-400 font-medium">Designed by Burb4noX</p>
      </div>
    </div>
  );

  const renderModeSelection = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4 space-y-8">
      <h2 className="text-3xl font-bold text-slate-800">Seleccione el Tipo de Estación</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <button 
          onClick={() => handleModeSelect('CASE')}
          className="flex flex-col items-center p-12 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-teal-500 hover:shadow-2xl transition group"
        >
          <div className="bg-teal-100 p-6 rounded-full mb-6 group-hover:scale-110 transition">
            <Activity size={64} className="text-teal-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">Generar Caso Clínico</h3>
          <p className="text-slate-500 text-center mt-2">Diagnóstico, enfoque y remisión de patologías.</p>
        </button>

        <button 
          onClick={() => handleModeSelect('PROCEDURE')}
          className="flex flex-col items-center p-12 bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 hover:shadow-2xl transition group"
        >
           <div className="bg-blue-100 p-6 rounded-full mb-6 group-hover:scale-110 transition">
            <Scissors size={64} className="text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">Generar Procedimiento</h3>
          <p className="text-slate-500 text-center mt-2">Evaluación de técnica quirúrgica, asepsia y destreza.</p>
        </button>
      </div>
    </div>
  );

  const renderTopicSelection = () => {
    const list = examMode === 'CASE' ? TOPICS_CASES : TOPICS_PROCEDURES;
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        <header className="bg-white shadow p-4 flex items-center justify-between">
           <button onClick={() => setStage(AppStage.MODE_SELECTION)} className="text-slate-500 hover:text-slate-800 font-medium">← Volver</button>
           <h2 className="text-xl font-bold text-slate-800">Seleccionar {examMode === 'CASE' ? 'Tema Clínico' : 'Procedimiento a Evaluar'}</h2>
           <div className="w-16"></div>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          {loadingError && (
             <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200">
               {loadingError}
             </div>
          )}
          
          <div className="max-w-4xl mx-auto">
             {examMode === 'CASE' && (
                <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-blue-800">Paciente Simulado</h4>
                    <p className="text-sm text-blue-600">¿Desea incluir guion con expresiones locales?</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <button 
                       onClick={() => setUseSimulatedPatient(false)}
                       className={`px-4 py-2 rounded-md font-medium ${!useSimulatedPatient ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
                     >No</button>
                     <button 
                       onClick={() => setUseSimulatedPatient(true)}
                       className={`px-4 py-2 rounded-md font-medium ${useSimulatedPatient ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
                     >Sí</button>
                  </div>
                </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {list.map(topic => (
                 <button 
                   key={topic}
                   onClick={() => handleTopicSelect(topic)}
                   className="text-left p-4 bg-white rounded-lg shadow border border-slate-200 hover:border-teal-500 hover:shadow-md transition font-medium text-slate-700"
                 >
                   {topic}
                 </button>
               ))}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLoading = (text: string) => (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-600 mb-6"></div>
      <h3 className="text-xl font-semibold text-slate-700">{text}</h3>
      <p className="text-slate-500 mt-2">Consultando literatura médica y GPC Colombianas...</p>
    </div>
  );

  const renderPreview = () => {
    if (!caseData) return null;
    const isProcedure = examMode === 'PROCEDURE';

    return (
      <div className="h-screen flex flex-col bg-slate-50">
        <header className="bg-white shadow p-4">
           <h2 className="text-xl font-bold text-center text-slate-800">Previsualización del {isProcedure ? 'Procedimiento' : 'Caso'} (Solo Docente)</h2>
        </header>
        <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">
           <div className="bg-white p-6 rounded-xl shadow-lg space-y-6">
              
              {/* STUDENT INSTRUCTIONS BANNER */}
              {caseData.studentInstructions && (
                  <div className="bg-indigo-600 rounded-lg p-6 text-white shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-20">
                          <Megaphone size={100} />
                      </div>
                      <div className="relative z-10">
                          <h3 className="font-bold text-indigo-100 uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                              <Megaphone size={16} /> Leer al Estudiante (Entrada)
                          </h3>
                          <p className="text-xl md:text-2xl font-serif font-medium leading-relaxed">
                              "{caseData.studentInstructions}"
                          </p>
                      </div>
                  </div>
              )}

              <div className="border-b pb-4">
                <span className="text-xs font-bold tracking-wider text-teal-600 uppercase">Tema de la Estación</span>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">{caseData.title}</h1>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                     <h3 className="font-bold text-amber-800 text-sm mb-1 uppercase tracking-wide">
                        {isProcedure ? 'Indicación / Procedimiento' : 'Motivo de Consulta'}
                     </h3>
                     <p className="text-slate-800 font-medium text-lg leading-tight">{caseData.chiefComplaint || "No especificado"}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                     <h3 className="font-bold text-slate-700 text-sm mb-1 uppercase tracking-wide">
                        {isProcedure ? 'Justificación Breve' : 'Resumen del Caso'}
                     </h3>
                     <p className="text-slate-600 text-sm">{caseData.description}</p>
                  </div>
              </div>

              {/* Only show Disease History if NOT a procedure */}
              {!isProcedure && (
                <div className="bg-white border-l-4 border-blue-500 pl-4 py-2">
                    <h3 className="font-bold text-slate-800 text-lg mb-2 flex items-center gap-2">
                        <Activity size={20} className="text-blue-600"/> Enfermedad Actual
                    </h3>
                    <p className="text-slate-700 leading-relaxed text-justify">{caseData.currentIllness || caseData.history}</p>
                </div>
              )}

              {/* Show Supplies for Procedure */}
              {isProcedure && caseData.supplies && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                    <h3 className="font-bold text-emerald-800 text-lg mb-2 flex items-center gap-2">
                        <Syringe size={20} /> Insumos / Equipo Requerido
                    </h3>
                    <p className="text-slate-800 whitespace-pre-wrap">{caseData.supplies}</p>
                </div>
              )}

              <div className="bg-blue-50 p-5 rounded-lg border border-blue-200 shadow-sm">
                 <h3 className="font-bold text-blue-900 text-lg mb-3 flex items-center gap-2">
                    <Target size={20} className="text-blue-700"/> Objetivos de Aprendizaje
                 </h3>
                 <ul className="list-disc ml-5 space-y-2 text-blue-900">
                    {caseData.objectives && caseData.objectives.length > 0 ? (
                        caseData.objectives.map((obj, idx) => (
                            <li key={idx} className="leading-snug">{obj}</li>
                        ))
                    ) : (
                        <li>Evaluar competencia técnica y seguridad.</li>
                    )}
                 </ul>
              </div>

              {caseData.simulatedPatientScript && !isProcedure && (
                 <div className="bg-purple-50 p-5 rounded-lg border border-purple-200 shadow-sm">
                    <h3 className="font-bold text-purple-800 text-lg mb-3 flex items-center gap-2">
                       <User size={20} /> Guion Paciente Simulado (Colombiano)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                       <div className="bg-white p-3 rounded border border-purple-100">
                          <span className="font-bold block text-purple-900 mb-1">Actitud</span> 
                          {caseData.simulatedPatientScript.attitude}
                        </div>
                       <div className="bg-white p-3 rounded border border-purple-100">
                          <span className="font-bold block text-purple-900 mb-1">Gestos</span>
                          {caseData.simulatedPatientScript.gestures}
                        </div>
                    </div>
                    <div>
                       <span className="font-bold text-purple-900 text-sm">Frases Obligatorias (Jerga Local):</span>
                       <ul className="list-disc ml-5 text-sm mt-2 text-purple-800 space-y-1">
                          {caseData.simulatedPatientScript.phrases.map((p, i) => <li key={i}>{p}</li>)}
                       </ul>
                    </div>
                 </div>
              )}

              <div className="flex gap-4 pt-4 border-t mt-4">
                 <button 
                   onClick={() => setStage(AppStage.TOPIC_SELECTION)} 
                   className="flex-1 py-3 px-4 border border-slate-300 rounded-lg text-slate-600 font-semibold hover:bg-slate-50 transition"
                 >
                   Cancelar / Nuevo Caso
                 </button>
                 <button 
                   onClick={startExam}
                   className="flex-1 py-3 px-4 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 shadow-md transition flex items-center justify-center gap-2"
                 >
                   <Play size={20} /> Iniciar (7 min Ejecución + 1 min Feedback)
                 </button>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderExam = () => {
    if (!caseData) return null;
    const isProcedure = examMode === 'PROCEDURE';

    return (
      <div className="h-screen flex flex-col bg-slate-100 pt-16">
        <Timer 
          seconds={timeRemaining} 
          setSeconds={setTimeRemaining} 
          isActive={isTimerActive} 
          onFinish={() => { /* Auto finish optional */}} 
        />
        
        <div className="flex-1 flex overflow-hidden">
           {/* LEFT PANEL: Case Info */}
           <div className="w-1/3 bg-white border-r border-slate-200 overflow-y-auto p-6 shadow-sm">
              <div className="space-y-6">
                
                {/* INSTRUCTION REMINDER */}
                {caseData.studentInstructions && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded p-3 mb-4">
                        <h4 className="text-xs font-bold text-indigo-700 uppercase flex items-center gap-1 mb-1">
                           <Megaphone size={12}/> Instrucción Inicial
                        </h4>
                        <p className="text-xs text-indigo-900 italic">"{caseData.studentInstructions}"</p>
                    </div>
                )}

                <div>
                   <h2 className="text-xl font-bold text-slate-900 mb-1">{caseData.title}</h2>
                   <span className="inline-block bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded font-medium">{student.name} ({student.id})</span>
                </div>

                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        {isProcedure ? <Scissors size={16}/> : <FileText size={16}/>} 
                        {isProcedure ? 'Contexto / Indicación' : 'Historia Clínica'}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{caseData.history}</p>
                  </div>

                  {!isProcedure && (
                    <div className="border-l-4 border-amber-500 pl-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><Activity size={16}/> Hallazgos / Paraclínicos</h3>
                        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">{caseData.vitalsAndLabs}</p>
                    </div>
                  )}

                  {isProcedure && caseData.supplies && (
                     <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
                        <h3 className="font-bold text-emerald-700 text-sm flex items-center gap-2"><Syringe size={14}/> Materiales / Insumos</h3>
                        <p className="text-xs text-emerald-800 mt-1 whitespace-pre-wrap leading-relaxed">{caseData.supplies}</p>
                     </div>
                  )}

                  {!isProcedure && caseData.redFlags.length > 0 && (
                     <div className="bg-red-50 p-3 rounded border border-red-100">
                        <h3 className="font-bold text-red-700 text-sm flex items-center gap-2"><AlertCircle size={14}/> Red Flags (Evaluador)</h3>
                        <ul className="list-disc ml-5 mt-1 text-xs text-red-800">
                           {caseData.redFlags.map((flag, idx) => <li key={idx}>{flag}</li>)}
                        </ul>
                     </div>
                  )}

                  {caseData.simulatedPatientScript && !isProcedure && (
                    <div className="bg-purple-50 p-3 rounded border border-purple-100">
                        <h3 className="font-bold text-purple-700 text-sm">Info Paciente Simulado</h3>
                        <p className="text-xs text-purple-800 mt-1"><strong>Permitido:</strong> {caseData.simulatedPatientScript.allowedInfo}</p>
                        <p className="text-xs text-purple-800 mt-1"><strong>Límite:</strong> {caseData.simulatedPatientScript.limitations}</p>
                    </div>
                  )}
                </div>
              </div>
           </div>

           {/* RIGHT PANEL: Checklist */}
           <div className="w-2/3 flex flex-col bg-slate-50">
              <div className="flex-1 overflow-y-auto p-6 pb-32">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 sticky top-0 bg-slate-50 pb-2 z-10 border-b">
                    {isProcedure ? 'Lista de Chequeo Técnica' : 'Lista de Chequeo Clínica'}
                 </h3>
                 
                 <div className="space-y-3">
                    {caseData.checklist.map((item) => {
                       const currentStatus = responses[item.id];
                       return (
                          <div key={item.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm transition hover:shadow-md">
                             <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                   <span className="text-xs font-bold text-slate-500 uppercase">{item.category}</span>
                                   <p className="text-slate-800 font-medium mt-1">{item.text}</p>
                                </div>
                                <div className="flex gap-1">
                                   {[
                                     { val: PerformanceStatus.CORRECT, color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200', icon: CheckCircle, label: 'Correcto' },
                                     { val: PerformanceStatus.PARTIAL, color: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200', icon: HelpCircle, label: 'Parcial' },
                                     { val: PerformanceStatus.INCORRECT, color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200', icon: XCircle, label: 'Error' },
                                     { val: PerformanceStatus.NOT_DONE, color: 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200', icon: XCircle, label: 'No Hizo' },
                                   ].map((opt) => (
                                      <button
                                        key={opt.val}
                                        onClick={() => handleChecklistChange(item.id, opt.val)}
                                        title={opt.label}
                                        className={`p-2 rounded-md border ${currentStatus === opt.val ? 'ring-2 ring-offset-1 ring-slate-400 font-bold scale-105 shadow-sm' : 'opacity-70'} ${opt.color}`}
                                      >
                                         <opt.icon size={20} />
                                      </button>
                                   ))}
                                </div>
                             </div>
                          </div>
                       );
                    })}
                 </div>
                 <div ref={notesEndRef} />
              </div>

              {/* Bottom Sticky Actions */}
              <div className="bg-white border-t border-slate-200 p-4 shadow-lg z-20">
                 <div className="flex gap-4 max-w-5xl mx-auto">
                    <div className="flex-1">
                       <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                           <PenTool size={14}/> Notas del Docente / Observaciones
                       </label>
                       <textarea 
                          className="w-full border border-slate-300 rounded-md p-2 text-sm h-24 focus:ring-teal-500 focus:border-teal-500"
                          placeholder={isProcedure ? 
                              "REGISTRE: Fallas en asepsia, técnica deficiente, temblor, inseguridad..." : 
                              "REGISTRE: Relación médico-paciente, orden lógico, omisiones..."}
                          value={evaluatorNotes}
                          onChange={(e) => setEvaluatorNotes(e.target.value)}
                       />
                    </div>
                    <div className="flex items-end">
                       <button 
                         onClick={finishExam}
                         className="bg-slate-900 text-white py-3 px-8 rounded-lg font-bold hover:bg-slate-800 transition flex items-center gap-2"
                       >
                          <Save size={20} /> Finalizar Estación
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!feedback || !caseData) return null;
    
    // Auto-save feedback score to state if not edited yet
    const currentScore = parseFloat(finalScoreOverride);
    const scoreColor = currentScore >= 4.0 ? 'text-green-600' : currentScore >= 3.0 ? 'text-yellow-600' : 'text-red-600';

    return (
      <div className="h-screen flex flex-col bg-slate-50 overflow-auto">
        <div className="max-w-4xl mx-auto w-full p-8 space-y-8">
           <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Resultados de Evaluación</h1>
                <p className="text-slate-500">{student.name} - {caseData.title}</p>
              </div>
              <div className="text-right">
                 <div className="text-sm text-slate-500 uppercase font-bold">Nota Final</div>
                 <div className={`text-4xl font-bold ${scoreColor}`}>{finalScoreOverride} <span className="text-xl text-slate-400">/ 5.0</span></div>
              </div>
           </header>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feedback Section */}
              <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
                 <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Retroalimentación Automática</h3>
                 
                 <div>
                    <h4 className="font-bold text-green-700 text-sm mb-1 flex items-center gap-1"><CheckCircle size={14}/> Aspectos Logrados</h4>
                    <ul className="text-sm list-disc ml-4 text-slate-700 space-y-1">
                       {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                 </div>
                 
                 <div>
                    <h4 className="font-bold text-amber-700 text-sm mb-1 flex items-center gap-1"><AlertCircle size={14}/> Aspectos por Mejorar</h4>
                    <ul className="text-sm list-disc ml-4 text-slate-700 space-y-1">
                       {feedback.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                 </div>

                 <div>
                    <h4 className="font-bold text-blue-700 text-sm mb-1 flex items-center gap-1"><Stethoscope size={14}/> Recomendaciones Clínicas</h4>
                    <ul className="text-sm list-disc ml-4 text-slate-700 space-y-1">
                       {feedback.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                 </div>
              </div>

              {/* Editing & Actions */}
              <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
                 <h3 className="font-bold text-lg text-slate-800 border-b pb-2">Validación del Docente</h3>
                 
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Docente Evaluador (Requerido)</label>
                    <input 
                      type="text" 
                      placeholder="Dr./Dra. Nombre Apellido"
                      className="w-full border border-slate-300 rounded-md p-2"
                      value={evaluatorName}
                      onChange={(e) => setEvaluatorName(e.target.value)}
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modificar Nota (0.0 - 5.0)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="5"
                      className="w-full border border-slate-300 rounded-md p-2 font-bold text-lg"
                      value={finalScoreOverride}
                      onChange={(e) => setFinalScoreOverride(e.target.value)}
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Justificación del Cambio (Obligatorio si se edita)</label>
                    <textarea 
                       className="w-full border border-slate-300 rounded-md p-2 text-sm h-24"
                       placeholder="Explique el motivo del ajuste de nota..."
                       value={scoreJustification}
                       onChange={(e) => setScoreJustification(e.target.value)}
                    />
                 </div>

                 <div className="pt-4 space-y-3">
                    <button 
                      onClick={handleDownloadPDF}
                      disabled={!evaluatorName.trim()}
                      className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${!evaluatorName.trim() ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-900'}`}
                    >
                       <Download size={20} /> Guardar y Descargar PDF
                    </button>
                    
                    <button 
                       onClick={() => {
                          setStudent({ name: '', id: '' });
                          setStage(AppStage.LOGIN);
                          setCaseData(null);
                          setFeedback(null);
                          setEvaluatorName('');
                          setResponses({});
                          setEvaluatorNotes('');
                          setFinalScoreOverride('');
                          setScoreJustification('');
                       }}
                       className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2"
                    >
                       <RefreshCw size={20} /> Nuevo Estudiante
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  // --- MAIN RENDER SWITCH ---
  switch (stage) {
    case AppStage.LOGIN: return renderLogin();
    case AppStage.MODE_SELECTION: return renderModeSelection();
    case AppStage.TOPIC_SELECTION: return renderTopicSelection();
    case AppStage.GENERATING: return renderLoading("Generando Escenario Clínico...");
    case AppStage.PREVIEW: return renderPreview();
    case AppStage.EXAM_RUNNING: return renderExam();
    case AppStage.FEEDBACK_GENERATION: return renderLoading("Analizando desempeño y generando retroalimentación...");
    case AppStage.RESULTS: return renderResults();
    default: return <div>Error de estado</div>;
  }
};

export default App;