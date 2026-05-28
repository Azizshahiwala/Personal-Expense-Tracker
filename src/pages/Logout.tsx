import { useEffect } from "react";
import { Link } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { useAuth } from "../context/AuthContext";

export default function Logout() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div>
      <PageMeta
        title="Logout | Group Expense Tracker"
        description="Logout from your account."
      />
      <PageBreadcrumb pageTitle="Logout" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Logout
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            You have been logged out successfully. You can either close this tab or sign in
          </p>

          <Link to="/signin" className="inline-block px-6 py-3 font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900">
            Sign In
          </Link>
          
        </div>
      </div>
    </div>
  );
}
