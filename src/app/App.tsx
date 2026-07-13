import { RouterProvider } from "react-router-dom";
import { FamilyGate } from "../features/family/FamilyGate";
import { router } from "./router";

export function App() {
  return (
    <FamilyGate>
      <RouterProvider router={router} />
    </FamilyGate>
  );
}
