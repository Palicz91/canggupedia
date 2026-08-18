import type { APIRoute } from 'astro';

const getRobotsTxt = (siteURL: string) => `User-agent: *
Allow: /
Sitemap: ${siteURL}sitemap-index.xml`;

export const GET: APIRoute = ({ site }) => {
  return new Response(getRobotsTxt(site?.toString() || ''));
};
