import React, { useEffect, useRef, useState } from 'react';

export default function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'
}) {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current) {
        const width = wrapperRef.current.offsetWidth;
        if (width > 0 && width < 304) {
          setScale(Math.max(0.75, (width - 4) / 300));
        } else {
          setScale(1);
        }
      }
    };

    handleResize();
    const timer = setTimeout(handleResize, 250);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: theme === 'dark' ? 'dark' : (theme === 'light' ? 'light' : 'auto'),
          size: 'flexible',
          callback: (token) => {
            if (isMounted && onVerify) onVerify(token);
          },
          'error-callback': () => {
            if (isMounted && onError) onError();
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire();
          }
        });
        widgetIdRef.current = id;
      } catch {}
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) renderWidget();
        };
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            if (isMounted) renderWidget();
          }
        }, 100);
        return () => {
          clearInterval(interval);
          isMounted = false;
          if (widgetIdRef.current && window.turnstile) {
            try {
              window.turnstile.remove(widgetIdRef.current);
            } catch {}
          }
        };
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [siteKey, theme]);

  return (
    <div
      ref={wrapperRef}
      className="flex justify-center items-center my-3 min-h-[65px] w-full overflow-visible"
    >
      <div
        ref={containerRef}
        className="flex justify-center origin-center transition-transform duration-150"
        style={{
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'center center'
        }}
      />
    </div>
  );
}
