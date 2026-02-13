import Layout from "@/layouts";
import Error404 from "@/pages/error404";
import Home from "@/pages/home";
import User from "@/pages/user";
import Entity from "@/pages/entity";
import Trades from "@/pages/trades";
import Transactions from "@/pages/transactions";
import QXAssets from "@/pages/qxassets";
import QXAssetDetail from "@/pages/qxassetdetail";
import Activity from "@/pages/activity";
import AdminPage from "@/pages/admin";
import { createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <Error404 />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/entity/:entity",
        element: <Entity />,
      },
      {
        path: "/trades",
        element: <Trades />,
      },
      {
        path: "/transactions",
        element: <Transactions />,
      },
      {
        path: "/qx-assets",
        element: <QXAssets />,
      },
      {
        path: "/qx-assets/:issuer/:asset",
        element: <QXAssetDetail />,
      },
      {
        path: "/account",
        element: <User />,
      },
      {
        path: "/activity",
        element: <Activity />,
      },
      {
        path: "/admin",
        element: <AdminPage />,
      }
    ],
  },
]);

export default router;
