import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayISO = toISO(new Date());

export default function DatePicker({ value, onChange, className = '', required }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const parsed = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  const openCalendar = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const popup = document.getElementById('datepicker-popup');
      if (popup?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const getDays = () => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = startOffset - 1; i >= 0; i--)
      cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), inMonth: false });
    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++)
      cells.push({ date: new Date(viewYear, viewMonth + 1, d), inMonth: false });
    return cells;
  };

  const displayValue = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('vi-VN')
    : '';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openCalendar}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm cursor-pointer bg-white text-left transition-colors ${
          open ? 'border-[#0058be] ring-1 ring-[#0058be]' : 'border-slate-300 hover:border-slate-400'
        } ${className}`}
      >
        <span className={value ? 'text-slate-800' : 'text-slate-400'}>
          {displayValue || 'Chọn ngày...'}
        </span>
        <Calendar size={15} className="text-slate-400 shrink-0" />
      </button>
      <input type="hidden" value={value} required={required} />

      {open && createPortal(
        <div
          id="datepicker-popup"
          style={{ top: pos.top, left: pos.left, minWidth: 280, position: 'fixed', zIndex: 9999 }}
          className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-700">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 px-3 pt-2 pb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-3 pb-2 gap-y-0.5">
            {getDays().map((cell, idx) => {
              const iso = toISO(cell.date);
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { onChange(iso); setOpen(false); }}
                  className={`h-8 w-full rounded-lg text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#0058be] text-white font-semibold'
                      : isToday
                      ? 'bg-[#e5eeff] text-[#0058be] font-semibold'
                      : cell.inMonth
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => { onChange(todayISO); setOpen(false); }}
              className="w-full text-xs text-[#0058be] hover:bg-[#e5eeff] py-1.5 rounded-lg cursor-pointer transition-colors font-medium"
            >
              Hôm nay
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
