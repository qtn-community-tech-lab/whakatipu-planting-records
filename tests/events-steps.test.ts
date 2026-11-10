import { describe, expect, it } from "vitest";
import { errorsForStep, firstStepWithError, STEP } from "@/lib/wrt/events/steps";

const errors = {
  "species.0.quantity": "Enter how many were planted.",
  plantedOn: "Enter a valid planting date.",
};

describe("form steps", () => {
  it("shows each step only its own errors", () => {
    expect(errorsForStep(errors, STEP.whereWhen)).toEqual({ plantedOn: errors.plantedOn });
    expect(errorsForStep(errors, STEP.whatPlanted)).toEqual({ "species.0.quantity": errors["species.0.quantity"] });
    expect(errorsForStep(errors, STEP.check)).toEqual({});
  });

  it("finds the first step with a problem, sending errors no step owns to the first", () => {
    expect(firstStepWithError(errors)).toBe(STEP.whereWhen);
    expect(firstStepWithError({ notes: "Too long." })).toBe(STEP.whatPlanted);
    expect(firstStepWithError({ form: "Something went wrong." })).toBe(STEP.whereWhen);
    expect(firstStepWithError({})).toBeNull();
  });
});
