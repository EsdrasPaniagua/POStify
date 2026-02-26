"use client";

import { useEffect } from 'react';

export function AdsBanner() {
  useEffect(() => {
    // Cargar script de AdSense
    const script = document.createElement('script');
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4465711555804592";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);

    return () => {
      // Limpiar al desmontar
      const existingScript = document.querySelector('script[src*="googlesyndication"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <div className="w-full flex justify-center my-4">
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-TU_CODIGO"
           data-ad-slot="TU_SLOT_ID"
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
    </div>
  );
}