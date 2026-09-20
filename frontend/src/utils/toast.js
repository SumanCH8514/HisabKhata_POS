import rawToast from 'react-hot-toast';
export { Toaster } from 'react-hot-toast';

export const toast = rawToast;

if (!toast.warning) {
  toast.warning = (message, options = {}) => {
    return rawToast(message, {
      icon: '⚠️',
      duration: options.duration || 4000,
      style: {
        border: '1px solid #f59e0b',
        color: '#b45309',
        ...options.style
      },
      ...options
    });
  };
}

if (!toast.info) {
  toast.info = (message, options = {}) => {
    return rawToast(message, {
      icon: 'ℹ️',
      duration: options.duration || 4000,
      ...options
    });
  };
}

if (typeof window !== 'undefined' && !window.__alert_toasted) {
  window.__alert_toasted = true;
  const originalAlert = window.alert;
  window.alert = (msg) => {
    const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
    if (/error|fail|invalid|unable|required/i.test(text)) {
      toast.error(text);
    } else {
      toast(text);
    }
  };
}

export default toast;
