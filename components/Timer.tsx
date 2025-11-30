import React, { useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerProps {
  seconds: number;
  setSeconds: React.Dispatch<React.SetStateAction<number>>;
  isActive: boolean;
  onFinish: () => void;
}

const Timer: React.FC<TimerProps> = ({ seconds, setSeconds, isActive, onFinish }) => {
  useEffect(() => {
    let interval: any = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(seconds => seconds - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      onFinish();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, onFinish, setSeconds]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isWarning = seconds <= 60; // Last minute
  
  return (
    <div className={`
      fixed top-0 left-0 right-0 h-16 shadow-md z-50 flex items-center justify-between px-6 transition-colors duration-500
      ${isWarning ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-900 text-white'}
    `}>
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg tracking-wider">ECOE/OSCE SURGERY</span>
      </div>

      <div className="flex items-center gap-4">
         {isWarning && (
            <div className="flex items-center gap-2 font-bold bg-white text-red-600 px-3 py-1 rounded-full uppercase text-sm">
                <AlertTriangle size={16} />
                <span>Último Minuto: Retroalimentación</span>
            </div>
         )}
         <div className="flex items-center gap-2 text-3xl font-mono font-bold">
            <Clock size={28} />
            {formatTime(seconds)}
         </div>
      </div>
    </div>
  );
};

export default Timer;