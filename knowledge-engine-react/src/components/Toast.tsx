// src/components/Toast.tsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ToastNotification } from '../types';

interface ToastProps {
  toast: ToastNotification;
  onDismiss: (id: number) => void;
}

const Toast = ({ toast, onDismiss }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.message}
      <button onClick={() => onDismiss(toast.id)}>&times;</button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: number) => void;
}

export const ToastContainer = ({ toasts, onDismiss }: ToastContainerProps) => {
  return createPortal(
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
};