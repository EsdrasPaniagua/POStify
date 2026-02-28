"use client";

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdsBannerProps {
  showWhen?: boolean;
}

export function AdsBanner({ showWhen = true }: AdsBannerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !showWhen) return;
    
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error(err);
    }
  }, [mounted, showWhen]);

  if (!mounted || !showWhen) return null;

  return (
    <div className="w-full flex justify-center my-4">
      <ins className="adsbygoogle"
           style={{ display: 'block', textAlign: 'center' }}
           data-ad-client="ca-pub-4465711555804592"
           data-ad-slot="YOUR_AD_SLOT_ID"
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
    </div>
  );
}