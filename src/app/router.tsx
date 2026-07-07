import { createBrowserRouter } from "react-router-dom";
import { AiSettingsPage } from "../pages/AiSettingsPage";
import { ChatPage } from "../pages/ChatPage";
import { HomePage } from "../pages/HomePage";
import { IngredientsPage } from "../pages/IngredientsPage";
import { RecipeBrowsePage } from "../pages/RecipeBrowsePage";
import { RecipeDetailPage } from "../pages/RecipeDetailPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/recipes", element: <RecipeBrowsePage /> },
  { path: "/recipes/:id", element: <RecipeDetailPage /> },
  { path: "/ingredients", element: <IngredientsPage /> },
  { path: "/chat", element: <ChatPage /> },
  { path: "/ai-settings", element: <AiSettingsPage /> },
]);
