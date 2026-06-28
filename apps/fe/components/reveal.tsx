"use client";

import { ReactNode, useEffect, useState } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: 'up' | 'fade' | 'scale';
  as?: 'div' | 'section';
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'up',
  as = 'div',
}: RevealProps) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.18 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  const motionProps = {
    className: `reveal-motion reveal-motion-${variant} ${isVisible ? 'is-visible' : ''} ${className}`,
    style: { transitionDelay: `${delay}ms` },
  };

  if (as === 'section') {
    return (
      <section
        ref={setNode}
        {...motionProps}
      >
        {children}
      </section>
    );
  }

  return (
    <div
      ref={setNode}
      {...motionProps}
    >
      {children}
    </div>
  );
}
