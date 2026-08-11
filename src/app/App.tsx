import { RouterProvider } from "react-router-dom";
import { SWRConfig } from "swr";
import { FamilyGate } from "../features/family/FamilyGate";
import { router } from "./router";

export function App() {
  return (
    <FamilyGate>
      <SWRConfig
        value={{ revalidateOnFocus: true, revalidateOnMount: true }}
      >
        <RouterProvider router={router} />
      </SWRConfig>
    </FamilyGate>
  );
}