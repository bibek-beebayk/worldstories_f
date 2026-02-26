import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function DefaultLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <>
      <Header />

      <main className="min-h-[calc(100vh-200px)]">
        <Outlet /> {/* child routes render here */}
      </main>

      <Footer />
    </>
  );
}
