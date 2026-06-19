"use client";

import { useEffect } from 'react';

export function HistoryListener() {
  useEffect(() => {
    const handlePopState = () => {
      // Force page reload on back/forward to ensure fresh session and data
      window.location.reload();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  return null;
}
