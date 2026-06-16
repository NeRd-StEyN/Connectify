import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { Home } from "./pages/Home";
import { Layout } from "./Layout/Layout";
import { Insta } from "./pages/Insta";
import { Myself } from "./pages/Myself";
import { Chat } from "./pages/Chat";
import { Search } from "./pages/Search";
import { Settings } from "./pages/Settings";
import { UserProfile } from "./pages/UserProfile";
import { ProtectedRoute } from "./ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: "search", element: <Search /> },
      { path: "chat", element: <Chat /> },
      { path: "insta", element: <Insta /> },
      { path: "myself", element: <Myself /> },
      { path: "settings", element: <Settings /> },
      { path: "user/:userId", element: <UserProfile /> },

      // Catch invalid sub-routes
      { path: "search/*", element: <Navigate to="/search" replace /> },
      { path: "chat/*", element: <Navigate to="/chat" replace /> },
      { path: "insta/*", element: <Navigate to="/insta" replace /> },
      { path: "myself/*", element: <Navigate to="/myself" replace /> },
      { path: "settings/*", element: <Navigate to="/settings" replace /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

export const App = () => <RouterProvider router={router} />;
