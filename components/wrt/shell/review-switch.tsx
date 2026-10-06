import { setReviewShown } from "@/app/actions";

/** Turns records still needing review on or off across the whole app. On by default; off shows confirmed records only. */
export function ReviewSwitch({ shown }: { shown: boolean }) {
  return (
    <form action={setReviewShown} className="wrt-switch">
      <input type="hidden" name="show" value={shown ? "0" : "1"} />
      <button
        type="submit" role="switch" aria-checked={shown} className="wrt-switch__btn"
        aria-label="Show records needing review"
        title={shown ? "Showing every record. Switch off for confirmed records only." : "Confirmed records only. Switch on to bring back records needing review."}
      >
        <span className="wrt-switch__track" aria-hidden="true"><i /></span>
        Needs review
      </button>
    </form>
  );
}
