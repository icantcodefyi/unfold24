import "@/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { ThirdwebProvider } from "thirdweb/react";
import { polygon } from "thirdweb/chains";

// Create Amoy testnet configuration (same as in deploy page)
const amoy = {
  ...polygon,
  id: 80002,
  name: "Polygon Amoy",
  rpc: ["https://rpc.amoy.testnet.polygon.technology"],
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "OKLink",
      url: "https://www.oklink.com/amoy",
    },
  },
  testnet: true,
};

export const metadata: Metadata = {
  title: "Blockchain AI",
  description: "Blockchain AI",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} bg-black`}>
      <ThirdwebProvider 
        chains={[amoy]}
        clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
      >
        <body>{children}</body>
      </ThirdwebProvider>
    </html>
  );
}
