import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FiShield } from "react-icons/fi";
import { useQubicConnect } from "@/components/connect/QubicConnectContext";
import { fetchUserInfo } from "@/services/backend.service";
import AdminPanel from "@/pages/user/UserNormal/AdminPanel";

const AdminPage: React.FC = () => {
  const { wallet } = useQubicConnect();
  const address = wallet?.publicKey;
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!address) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userInfo = await fetchUserInfo(address);
        setIsAdmin(userInfo.role === "admin");
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminRole();
  }, [address]);

  if (loading) {
    return (
      <div className="container mx-auto min-h-screen px-4 py-6">
        <div className="flex items-center justify-center py-16">
          <AiOutlineLoading3Quarters className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="container mx-auto min-h-screen px-4 py-6">
        <Card className="mx-auto w-full max-w-4xl border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FiShield className="h-5 w-5 text-yellow-600" />
              Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Please connect your wallet to access the admin page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto min-h-screen px-4 py-6">
        <Card className="mx-auto w-full max-w-4xl border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FiShield className="h-5 w-5 text-yellow-600" />
              Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen px-4 py-6">
      <Card className="mx-auto w-full max-w-6xl border-0 shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <FiShield className="h-6 w-6 text-yellow-600" />
            Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <AdminPanel />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
