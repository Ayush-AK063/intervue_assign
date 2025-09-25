import { Inter } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../contexts/SocketContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Intervue Poll",
  description: "Interactive polling and chat platform for classrooms and meetings",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
