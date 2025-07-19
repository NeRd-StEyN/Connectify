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
       {
        path: "search/*", // catch all invalid sub-routes like /search/wrong
        element: <Navigate to="/search" replace />,
      },
      { path: "chat", element: <Chat /> },
       {
        path: "chat/*", // catch all invalid sub-routes like /search/wrong
        element: <Navigate to="/chat" replace />,
      },
      { path: "insta", element: <Insta /> },
       {
        path: "insta/*", // catch all invalid sub-routes like /search/wrong
        element: <Navigate to="/insta" replace />,
      },
      { path: "myself", element: <Myself /> },
       {
        path: "myself/*", // catch all invalid sub-routes like /search/wrong
        element: <Navigate to="/myself" replace />,
      },
    ],
  },
  {
    path: "*",
     element: <Navigate to="/" replace />, // or <Navigate to="/" replace /> or <NotFound />
  },
]);

export const App = () => <RouterProvider router={router} />;
