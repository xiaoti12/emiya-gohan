import { createBrowserRouter } from "react-router-dom";
import { AiSettingsPage } from "../pages/AiSettingsPage";
import { ChatPage } from "../pages/ChatPage";
import { CookedHistoryPage } from "../pages/CookedHistoryPage";
import { HomePage } from "../pages/HomePage";
import { IngredientsPage } from "../pages/IngredientsPage";
import { RecipeBrowsePage } from "../pages/RecipeBrowsePage";
import { RecipeDetailPage } from "../pages/RecipeDetailPage";
import { RecipeFormPage } from "../pages/RecipeFormPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/recipes", element: <RecipeBrowsePage /> },
  { path: "/recipes/new", element: <RecipeFormPage /> },
  { path: "/recipes/:id/edit", element: <RecipeFormPage /> },
  { path: "/recipes/:id", element: <RecipeDetailPage /> },
  { path: "/ingredients", element: <IngredientsPage /> },
  { path: "/cooked-history", element: <CookedHistoryPage /> },
  { path: "/chat", element: <ChatPage /> },
  { path: "/ai-settings", element: <AiSettingsPage /> },
]);