import type { Metadata, Viewport } from 'next';
import './globals.css';
import './components.css';
import { fetchLandingConfig } from '../lib/landingConfig';
import { metaDefaults } from '../lib/landingDefaults';
import { AuthProvider } from '../components/AuthProvider';
import { ThemeProvider } from '../components/ThemeProvider';

export async function generateMetadata(): Promise<Metadata> {
  const config = await fetchLandingConfig();
  const meta = config?.meta ?? metaDefaults;
  return {
    title: `${meta.siteName} - ${meta.descriptor}`,
    description: meta.longDescriptor,
    openGraph: {
      title: `${meta.siteName} - Financial education made clear`,
      description: meta.longDescriptor,
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: '#fbfaf6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
