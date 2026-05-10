import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  displayNames?: Record<string, string>;
  className?: string;
}

export default function CustomSelect({ value, onChange, options, displayNames, className = '' }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between pl-3 pr-3 py-2 border border-slate-300 focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] rounded-lg text-sm bg-white outline-none cursor-pointer text-left"
      >
        <span className="truncate">{displayNames ? displayNames[value] || value : value}</span>
        <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map(opt => (
            <li key={opt}>
              <button
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer text-left"
              >
                <span className={value === opt ? 'text-[#0058be] font-medium' : 'text-slate-700'}>{displayNames ? displayNames[opt] || opt : opt}</span>
                {value === opt && <Check size={14} className="text-[#0058be] shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
