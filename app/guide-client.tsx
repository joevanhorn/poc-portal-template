"use client";

import { useEffect } from "react";

type Props = {
  styles: string;
  body: string;
};

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void;
      run: (config?: Record<string, unknown>) => Promise<void>;
    };
  }
}

export default function GuideClient({ styles, body }: Props) {
  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (cancelled || !window.mermaid) return;
      window.mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: "basis" },
      });
      window.mermaid.run().catch(() => {});
    };

    if (window.mermaid) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.mermaid) {
          clearInterval(interval);
          init();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </>
  );
}
