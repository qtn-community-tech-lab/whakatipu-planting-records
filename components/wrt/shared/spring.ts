/**
 * A damped spring for one number, driven by requestAnimationFrame. It keeps
 * its speed between targets, so a flick hands its speed to the settle and a
 * new target mid-way never jumps. CSS transitions restart from zero speed.
 */
export class Spring {
  value: number;
  velocity = 0;
  private target: number;
  private frame = 0;
  private last = 0;

  /** The defaults overshoot a little and settle in about half a second: bouncy, not wobbly. */
  constructor(value: number, private onFrame: (value: number) => void, private stiffness = 300, private damping = 22) {
    this.value = value;
    this.target = value;
  }

  /** Spring to `target`, starting at `velocity` (px/s) if given. */
  to(target: number, velocity?: number) {
    this.target = target;
    if (velocity !== undefined) this.velocity = velocity;
    if (!this.frame) {
      this.last = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  /** Follow the finger directly; the spring stops. */
  set(value: number) {
    this.stop();
    this.value = value;
    this.velocity = 0;
    this.onFrame(value);
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private tick = (now: number) => {
    // Small fixed steps keep the spring stable on a slow frame.
    let dt = Math.min((now - this.last) / 1000, 0.064);
    this.last = now;
    while (dt > 0) {
      const h = Math.min(dt, 1 / 240);
      this.velocity += (-this.stiffness * (this.value - this.target) - this.damping * this.velocity) * h;
      this.value += this.velocity * h;
      dt -= h;
    }
    const done = Math.abs(this.velocity) < 2 && Math.abs(this.value - this.target) < 0.25;
    if (done) this.value = this.target;
    this.onFrame(this.value);
    this.frame = done ? 0 : requestAnimationFrame(this.tick);
  };
}

/** iOS rubber band: the further past the edge, the less it moves. */
export function rubberBand(overshoot: number, dimension: number) {
  return Math.sign(overshoot) * (1 - 1 / ((Math.abs(overshoot) * 0.55) / dimension + 1)) * dimension;
}

/** Where a flick would come to rest (UIScrollView's normal deceleration). */
export function project(velocity: number) {
  return ((velocity / 1000) * 0.998) / (1 - 0.998);
}
