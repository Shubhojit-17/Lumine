import React, { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export const Section: React.FC<SectionProps> = ({ children, className = '', id }) => {
  return (
    <section 
      id={id}
      className={`min-h-[100vh] w-full flex flex-col items-center justify-center relative px-6 py-20 ${className}`}
    >
      {children}
    </section>
  );
};
