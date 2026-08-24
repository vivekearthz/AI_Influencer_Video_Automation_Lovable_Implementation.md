import * as React from "react";

interface SeoProps {
  title: string;
  description: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Lightweight client-side head manager (spec §9). Note: since this is a
 * client-rendered SPA, crawlers that don't execute JavaScript (some AI
 * crawlers included) won't see these tags on first paint. For full AEO/SEO
 * crawlability, prerender the marketing routes (`/`, `/for-creators`,
 * `/for-brands`, `/pricing`, `/trust-and-compliance`, `/faq`) at build time
 * — e.g. with `vite-plugin-ssr`/`vite-react-ssg` — before shipping to
 * production. Documented as a follow-up in README.md.
 */
export function Seo({ title, description, jsonLd }: SeoProps) {
  React.useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setMeta("description", description);

    const scripts: HTMLScriptElement[] = [];
    if (jsonLd) {
      const entries = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      for (const entry of entries) {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.text = JSON.stringify(entry);
        document.head.appendChild(script);
        scripts.push(script);
      }
    }

    return () => {
      scripts.forEach((s) => s.remove());
    };
  }, [title, description, jsonLd]);

  return null;
}
