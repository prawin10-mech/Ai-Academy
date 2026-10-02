import './globals.css';
import Providers from '../components/Providers.js';
import { SITE_DESC, SITE_NAME, SITE_TAGLINE, siteUrl } from '../lib/site.js';

export const metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESC,
  robots: { index: true, follow: true },
  openGraph: { title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESC, type: 'website', siteName: SITE_NAME },
  twitter: { card: 'summary_large_image', title: `${SITE_NAME}: ${SITE_TAGLINE}`, description: SITE_DESC },
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@400;600&display=swap" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('ai-academy-skin')||'auto',d=new Date(),m=d.getMonth()+1,n=d.getDate(),L=['classic','hero','spooky','neon','sunrise','genz','genalpha','web','cyber','sunsetcity'],W=['sunsetcity','classic','genz','web','cyber','genalpha','hero'],s=(m==10&&n>=15)||(m==11&&n==1)?'spooky':null,r=L.indexOf(p)>=0?p:s||(p=='daily'?W[d.getDay()]:'classic');document.documentElement.setAttribute('data-skin',r)}catch(e){}})();` }} />
        <script dangerouslySetInnerHTML={{ __html: 'window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};' }} />
        <script defer src="/_vercel/insights/script.js" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
