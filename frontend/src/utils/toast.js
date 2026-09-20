// Toast event-based singleton emitter
const listeners = new Set();

export const toast = (message, options = {}) => {
  const id = options.id || Math.random().toString(36).substring(2, 9);
  const toastItem = {
    id,
    message,
    type: options.type || 'info',
    duration: options.duration !== undefined ? options.duration : 4000,
    title: options.title || null,
    action: options.action || null,
    ...options
  };

  listeners.forEach(fn => fn({ action: 'show', toast: toastItem }));
  return id;
};

toast.success = (message, options = {}) => toast(message, { ...options, type: 'success' });
toast.error = (message, options = {}) => toast(message, { ...options, type: 'error', duration: options.duration || 5000 });
toast.warning = (message, options = {}) => toast(message, { ...options, type: 'warning' });
toast.info = (message, options = {}) => toast(message, { ...options, type: 'info' });
toast.dismiss = (id) => {
  listeners.forEach(fn => fn({ action: 'dismiss', id }));
};

export const subscribeToast = (callback) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

export default toast;
