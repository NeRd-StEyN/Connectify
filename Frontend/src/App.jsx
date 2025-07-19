import { createBrowserRouter,Navigate, RouterProvider } from "react-router-dom";
import { Home } from "./pages/Home";
import { Layout } from "./Layout/Layout";
import { Insta } from "./pages/Insta";
import { Myself } from "./pages/Myself";
import { Chat } from "./pages/Chat";
import { Search } from "./pages/Search";
import {ProtectedRoute} from "./ProtectedRoute";
const router = createBrowserRouter([
  {
    path: "/", // Public Home
    element: <Home />,
  },
  {
    path: "/app", // All protected routes go under /app/*
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

      // Catch invalid sub-routes under /app/*
      { path: "search/*", element: <Navigate to="/app/search" replace /> },
      { path: "chat/*", element: <Navigate to="/app/chat" replace /> },
      { path: "insta/*", element: <Navigate to="/app/insta" replace /> },
      { path: "myself/*", element: <Navigate to="/app/myself" replace /> },
    ],
  },
  {
    path: "*", // Catch all unknown routes
    element: <Navigate to="/" replace />,
  },
]);

export const App = () => <RouterProvider router={router} />;
