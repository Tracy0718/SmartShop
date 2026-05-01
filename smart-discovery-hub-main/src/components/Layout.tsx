import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Chatbot } from "@/components/Chatbot";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <footer className="bg-primary text-primary-foreground text-center text-xs py-4 mt-8">
        © {new Date().getFullYear()} Prodvise · Personalized AI shopping
      </footer>
      <Chatbot />
    </div>
  );
}
