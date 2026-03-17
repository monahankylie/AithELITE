import React, { useEffect } from "react";

interface NotificationPopupProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({
  message,
  type,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'success' ? 'bg-[#00599c]' : 'bg-red-600';
  const icon = type === 'success' ? (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <div className="fixed bottom-12 left-1/2 z-[9999] -translate-x-1/2 px-4 pointer-events-none">
      <div 
        className={`${bgColor} flex items-center gap-4 rounded-3xl px-8 py-5 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-500 animate-in slide-in-from-bottom-8 fade-in pointer-events-auto`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          {icon}
        </div>
        <p className="text-sm font-bold uppercase tracking-widest">{message}</p>
        <button 
          onClick={onClose}
          className="ml-4 rounded-full p-1 hover:bg-white/20 transition-colors"
        >
          <svg className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationPopup;
