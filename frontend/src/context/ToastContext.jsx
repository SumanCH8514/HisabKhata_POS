import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ToastContainer } from '../components/Toast.jsx';
import { toast, subscribeToast } from '../utils/toast.js';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((newToast) => {
    setToasts((prev) => {
      // Limit to 5 active toasts to prevent screen clutter
      const filtered = prev.filter((t) => t.id !== newToast.id);
      if (filtered.length >= 5) {
        filtered.shift();
      }
      return [...filtered, newToast];
    });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToast(({ action, toast: t, id }) => {
      if (action === 'show' && t) {
        addToast(t);
      } else if (action === 'dismiss' && id) {
        dismissToast(id);
      }
    });

    // Gracefully route any legacy browser alert() calls to toast
    const originalAlert = window.alert;
    window.alert = (msg) => {
      const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
      // If message indicates failure or error, use error toast, otherwise info/warning
      if (/error|fail|invalid|unable|required/i.test(text)) {
        toast.error(text);
      } else {
        toast.info(text);
      }
    };

    return () => {
      unsubscribe();
      window.alert = originalAlert;
    };
  }, [addToast, dismissToast]);

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return the singleton toast so it can still be used even if outside provider
    return { toast };
  }
  return context;
}

export default ToastProvider;
