"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";

/**
 * shadcn Combobox (the Base UI version), rendered with Canopy classes in
 * styles/app.css ("Combobox"). Only the parts this app uses; Canopy is
 * icon-free, so the clear and open buttons are text glyphs.
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
            ×
          </ComboboxPrimitive.Clear>
        )}
        <ComboboxPrimitive.Trigger data-slot="combobox-trigger" className="wrt-combobox__button wrt-combobox__chevron" aria-label={triggerLabel} />
      </span>
    </ComboboxPrimitive.InputGroup>
  );
}

function ComboboxContent({ className, sideOffset = 6, ...props }: ComboboxPrimitive.Popup.Props & Pick<ComboboxPrimitive.Positioner.Props, "sideOffset">) {
  return (
    <ComboboxPrimitive.Portal>
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

export { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty };
