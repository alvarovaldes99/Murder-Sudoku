import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'My Google AI Studio App',
  description: 'My Google AI Studio App',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="h-[100dvh] overflow-hidden overscroll-none">
      <body suppressHydrationWarning className="h-full overflow-hidden overscroll-none bg-stone-100">{children}</body>
    </html>
  );
}
