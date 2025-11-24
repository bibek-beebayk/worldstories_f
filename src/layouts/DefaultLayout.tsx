import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

export default function DefaultLayout() {
  return (
    <>
      <Header />

      {/* Global toasters placed here so they are visible on every page */}
      <Toaster />
      <Sonner />

      <main className="min-h-[calc(100vh-200px)]">
        <Outlet /> {/* child routes render here */}
      </main>

      <Footer />
    </>
  );
}
