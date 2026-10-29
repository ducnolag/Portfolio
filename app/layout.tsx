import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/ui/Providers";
import { profile } from "@/lib/content";

/* One variable grotesque carries display and body (optical sizes do the work);
   a serif italic is the single accent voice, for latin words only. */
const display = Bricolage_Grotesque({
  subsets: ["latin", "vietnamese"],
  axes: ["opsz", "wdth"],
  variable: "--font-display",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const title = `${profile.name} · Business Analyst & AI Engineer`;
const description =
  "Portfolio of Nguyễn Mạnh Đức (ducnolag): Business Analyst, AI Engineer and full-stack builder. Projects in AI tooling, data science and web systems.";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL("https://ducnolag.vercel.app"),
  openGraph: {
    title,
    description,
    type: "website",
    images: [{ url: "/images/duc-sunset.jpg", width: 761, height: 960 }],
  },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${serif.variable}`}
      data-motion="full"
      suppressHydrationWarning
    >
      <head>
        {/* Apply the stored motion choice before first paint (default: full motion). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=localStorage.getItem('portfolio.motion');document.documentElement.dataset.motion=(m==='reduce')?'reduce':'full'}catch(e){}",
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
