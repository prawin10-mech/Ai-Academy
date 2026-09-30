import './globals.css';
import Providers from '../components/Providers.js';

export const metadata = {
  title: 'AI Engineer Academy',
  description: 'Courses, notes, quizzes and research papers on the path to AI engineer.',
  robots: { index: true, follow: true },
  openGraph: { title: 'AI Engineer Academy', description: 'A free 6-month, job-focused path to AI engineering: agentic AI, RAG, evals and production.', type: 'website' },
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
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem('ai-academy-skin')||'auto',d=new Date(),m=d.getMonth()+1,n=d.getDate(),L=['classic','hero','spooky','neon','sunrise','genz','genalpha','web'],W=['sunrise','classic','genz','web','neon','genalpha','hero'],s=(m==10&&n>=15)||(m==11&&n==1)?'spooky':null,r=L.indexOf(p)>=0?p:s||(p=='daily'?W[d.getDay()]:'classic');document.documentElement.setAttribute('data-skin',r)}catch(e){}})();` }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
