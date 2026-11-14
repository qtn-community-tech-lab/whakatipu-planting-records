"use client";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarFootNav, SidebarNav } from "./sidebar-nav";
import type { NavCounts } from "./nav";

export function MobileNav({ counts, authenticated = false }: { counts?: NavCounts | undefined; authenticated?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="cn-btn cn-btn--soft cn-btn--sm">Menu</SheetTrigger>
      <SheetContent title="Menu" eyebrow="Whakatipu Reforestation Trust" side="left" className="!w-[300px]">
        <div className="flex flex-col gap-6 flex-1">
          <SidebarNav counts={counts} authenticated={authenticated} onNavigate={() => setOpen(false)} />
          <SidebarFootNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
