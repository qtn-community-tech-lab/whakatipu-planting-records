/** Shown on every planting-event page while storage is the local JSON file (lib/wrt/events/json-event-store.ts). */
export function PrototypeNotice() {
  return (
    <div className="cn-callout cn-callout--note cn-callout--sm" role="note">
      Prototype: there is no sign-in yet, and events are saved to a file on this computer only.
      They are not added to the historical totals. Use Export CSV to keep a copy.
    </div>
  );
}
