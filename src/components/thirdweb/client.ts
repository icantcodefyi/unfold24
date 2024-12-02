/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createThirdwebClient } from "thirdweb";
import { env } from "@/env";

export const client = createThirdwebClient({
  clientId: env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
});
