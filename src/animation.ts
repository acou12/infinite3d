import { Vector3 } from "three";

export type AnimationType = "SLIDE" | "JUMP";

interface PieceAnimation {
  position: Vector3;
  from: Vector3;
  to: Vector3;
  duration: number;
  type: AnimationType;
  progress: number;
  doneCallback?: () => void;
}

export class AnimationDispatcher {
  private currentAnimations: PieceAnimation[];

  constructor() {
    this.currentAnimations = [];
  }

  slide(options: {
    position: Vector3;
    to: Vector3;
    duration: number;
    type: AnimationType;
    doneCallback?: () => void;
  }) {
    const animation: PieceAnimation = {
      ...options,
      from: options.position.clone(),
      progress: 0,
    };
    this.currentAnimations.push(animation);
  }

  update(delta: number) {
    this.currentAnimations.forEach((animation) => {
      animation.progress += delta;
      const { position, from, to, duration, type, progress, doneCallback } =
        animation;
      const progressPercentage = progress / duration;
      if (progressPercentage >= 1) {
        position.copy(to);
        this.currentAnimations = this.currentAnimations.filter(
          (a) => a !== animation
        );
        doneCallback?.();
        return;
      } else {
        let newPosition = new Vector3();
        const easedPercentage = easeInOutQuad(progressPercentage);
        if (type === "SLIDE") {
          newPosition.lerpVectors(from, to, easedPercentage);
        } else if (type === "JUMP") {
          newPosition.lerpVectors(from, to, easedPercentage);
          // This is a simple negative quadratic to simulate a jump, with a max height of 3.
          const maxHeight = 3;
          newPosition.y =
            from.y +
            (-((easedPercentage - 0.5) * (easedPercentage - 0.5)) * 4 + 1) *
              maxHeight;
        }
        position.copy(newPosition);
      }
    });
  }
}

function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
