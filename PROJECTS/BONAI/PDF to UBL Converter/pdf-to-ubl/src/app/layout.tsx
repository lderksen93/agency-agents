import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bonai — PDF naar UBL Converter",
  description: "Converteer PDF-facturen naar gevalideerde UBL XML (Peppol BIS 3.0). Zero Data Retention, verwerking op Europese servers.",
  keywords: ["PDF naar UBL", "UBL converter", "Peppol", "factuur", "XML", "e-factureren", "Bonai"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
