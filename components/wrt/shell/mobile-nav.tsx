"use client";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="cn-btn cn-btn--soft cn-btn--sm">Menu</SheetTrigger>
      <SheetContent title="Menu" eyebrow="Whakatipu Reforestation Trust" side="left" className="!w-[300px]">
        <div className="flex flex-col gap-6 flex-1">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
