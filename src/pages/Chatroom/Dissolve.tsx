import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

export default function Dissolve() {
  const navigate = useNavigate();
  const { isAdmin, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user data exists in localStorage
    const data = localStorage.getItem('user');
    if (!data) {
      setIsLoading(false);
      return;
    }

    try {
      JSON.parse(data); // Just validate the JSON
      setIsLoading(false);
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check admin access only after data is loaded
    if (!isLoading) {
      if (!isLoggedIn || !isAdmin) {
        navigate('/');
        return;
      }
    }
  }, [isLoading, isLoggedIn, isAdmin, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <PageMeta
        title="Dissolve Chatroom | Group Expense Tracker"
        description="Dissolve or close the current chatroom in Group Expense Tracker."
      />
      <PageBreadcrumb pageTitle="Dissolve" />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        <div className="mx-auto w-full max-w-[630px] text-center">
          <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
            Dissolve Chatroom
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            Close the chatroom or manage chatroom dissolution options.
          </p>
        </div>
      </div>
    </div>
  );
}
