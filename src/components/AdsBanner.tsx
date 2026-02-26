"use client";

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: any;
  }
}

export function AdsBanner() {
  const bannerRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (window.adsbygoogle) {
      try {
        (window.adsbygoogle as any).push({});
      } catch (e) {
        console.log('AdSense:', e);
      }
    }
  }, []);

  return (
    <div className="w-full flex justify-center my-4 px-4">
      <ins className="adsbygoogle"
           ref={bannerRef}
           style={{ display: 'block', width: '100%', maxWidth: '728px', height: '90px' }}
           data-ad-client="ca-pub-4465711555804592"
           data-ad-slot="1234567890"
           data-ad-format="horizontal"
           data-full-width-responsive="true">
      </ins>
    </div>
  );
}