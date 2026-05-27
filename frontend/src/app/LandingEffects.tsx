'use client';

import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/api';
import s from './landing.module.css';

export default function LandingEffects() {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      if (!sessionStorage.getItem('pv_landing')) {
        sessionStorage.setItem('pv_landing', '1');
        const source = new URLSearchParams(window.location.search).get('utm_source');
        void trackEvent('page_view_landing', null, source);
      }
    }
  }, []);

  useEffect(() => {
    const reveals = document.querySelectorAll(`.${s.reveal}`);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add(s.visible);
        });
      },
      { threshold: 0.15 },
    );
    reveals.forEach((r) => observer.observe(r));
    return () => observer.disconnect();
  }, []);

  return null;
}
