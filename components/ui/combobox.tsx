"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";

/**
 * shadcn Combobox (the Base UI version), rendered with Canopy classes in
 * styles/app.css ("Combobox"). Only the parts this app uses; the clear and
 * open buttons use small, centered marks.
 *
 * The input is the control: you type where you clicked, and the list opens
 * directly underneath it.
 */
const Combobox = ComboboxPrimitive.Root;

function ComboboxInput({
  className, showClear = true, clearLabel = "Clear", triggerLabel = "Show all", ...props
}: ComboboxPrimitive.Input.Props & { showClear?: boolean; clearLabel?: string | undefined; triggerLabel?: string }) {
  return (
    <ComboboxPrimitive.InputGroup data-slot="combobox-input-group" className="wrt-combobox">
      <ComboboxPrimitive.Input data-slot="combobox-input" className={cn("cn-input wrt-combobox__input", className)} {...props} />
      <span className="wrt-combobox__actions">
        {showClear && (
          <ComboboxPrimitive.Clear data-slot="combobox-clear" className="wrt-combobox__button" aria-label={clearLabel}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
              <path d="m2 2 8 8m0-8-8 8" />
            </svg>
          </ComboboxPrimitive.Clear>
        )}
        <ComboboxPrimitive.Trigger data-slot="combobox-trigger" className="wrt-combobox__button wrt-combobox__chevron" aria-label={triggerLabel} />
      </span>
    </ComboboxPrimitive.InputGroup>
  );
}

/**
 * Where the list is portaled (default: <body>). Inside a drawer, provide the
 * drawer's element: vaul leaves <body> with pointer-events: none, so a list
 * outside the drawer can't be scrolled or clicked.
 */
const ComboboxPortalContainer = React.createContext<HTMLElement | null>(null);

function ComboboxContent({ className, sideOffset = 6, ...props }: ComboboxPrimitive.Popup.Props & Pick<ComboboxPrimitive.Positioner.Props, "sideOffset">) {
  const container = React.useContext(ComboboxPortalContainer);
  return (
    <ComboboxPrimitive.Portal container={container ?? undefined}>
      <ComboboxPrimitive.Positioner side="bottom" align="start" sideOffset={sideOffset} className="wrt-combobox__positioner">
        <ComboboxPrimitive.Popup data-slot="combobox-content" className={cn("wrt-combobox__popup", className)} {...props} />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return <ComboboxPrimitive.List data-slot="combobox-list" className={cn("wrt-combobox__list", className)} {...props} />;
}

function ComboboxItem({ className, ...props }: ComboboxPrimitive.Item.Props) {
  return <ComboboxPrimitive.Item data-slot="combobox-item" className={cn("wrt-combobox__item", className)} {...props} />;
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return <ComboboxPrimitive.Empty data-slot="combobox-empty" className={cn("wrt-combobox__empty", className)} {...props} />;
}

export { Combobox, ComboboxPortalContainer, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty };
