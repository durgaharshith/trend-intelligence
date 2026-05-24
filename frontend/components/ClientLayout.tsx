"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Navbar from "./Navbar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", next ? "true" : "false");
  };

  const isPublic = pathname === "/" || pathname === "/login";

  if (isPublic) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar isPublic={true} />
        <div className="flex-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-text-primary">
      <Navbar
        isPublic={false}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
      />
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ${
          collapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
