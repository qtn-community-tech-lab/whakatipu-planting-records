/** Shown on the planting-event form until events are saved to the database. */
export function PrototypeNotice() {
  return (
    <div className="cn-callout cn-callout--note cn-callout--sm" role="note">
      Prototype: nothing is saved yet. You can fill in the form and check it, but no planting event is recorded.
    </div>
  );
}
