/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createThirdwebClient } from "thirdweb";
import { avalancheFuji, polygonAmoy, baseSepolia } from "thirdweb/chains";

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
  supportedChains: [polygonAmoy, avalancheFuji, baseSepolia]
});
