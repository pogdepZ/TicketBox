"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to top immediately when pathname changes or component mounts
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    
    // Smooth scroll backup after layout calculations
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    }, 50);

    // Request animation frame backup
    const rafId = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
    });

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  return null;
}
