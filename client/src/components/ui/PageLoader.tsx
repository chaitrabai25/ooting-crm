import React from 'react';
import { BrandLoader } from './BrandLoader.js';

/**
 * PageLoader Component
 * Sleek, professional full-page / route-transition loading placeholder
 * with official Ooting logo animation and high-contrast styling.
 */
export const PageLoader: React.FC<{ text?: string; subtext?: string }> = ({
  text = 'Loading Ooting CRM...',
  subtext = 'Preparing workspace data',
}) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full p-8 animate-fadeIn">
      <BrandLoader size="lg" text={text} subtext={subtext} />
    </div>
  );
};

export default PageLoader;
