import "./globals.css";

export const metadata = {
  title: "Banalata Resort • Scan & Order",
  description: "QR-code table ordering at Banalata Hotel & Resort, Joypur.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Noto+Serif+Bengali:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen text-brand-900">{children}</body>
    </html>
  );
}
