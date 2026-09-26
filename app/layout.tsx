import {UsageTracking} from "@/components/telemetry/provider";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./refinement.css";
import "./cat-life.css";
import "./polished-refuge.css";
import "./learning-visuals.css";
import "./admin-creation.css";
import "./care-journey.css";
import "./drive-library.css";
import "./question-library.css";
import "./answer-feedback.css";
import "./clean-question.css";
export const metadata: Metadata = {
  title: "Refugio",
  description: "Un lugar pequeño para crecer juntos.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fff9ee",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><UsageTracking/>{children}</body>
    </html>
  );
}
