import React, { useEffect } from 'react';
import { Icons } from './Icons';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-md-primary/10 border-md-primary text-md-primary',
    error: 'bg-md-error/10 border-md-error text-md-error',
    info: 'bg-md-secondary/10 border-md-secondary text-md-secondary'
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-full border backdrop-blur-md shadow-2xl animate-fade-in-up ${bgColors[type]}`}>
      {type === 'success' && <Icons.Check size={18} />}
      {type === 'error' && <Icons.Zap size={18} />}
      {type === 'info' && <Icons.Info size={18} />}
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
};