/**
 * Shared geometry of the scene. Everything is expressed in logical pixels of
 * the 320x180 framebuffer; CSS scales the canvas up with nearest-neighbour.
 */

export const W = 320;
export const H = 180;

/** Base of the flames: the single light source of the scene. */
export const FIRE_X = 160;
export const FIRE_Y = 108;

/**
 * The camera looks down at a steep 3/4 angle, so a circle on the ground is an
 * ellipse on screen. Vertical screen distances are stretched by this factor
 * to get ground distances.
 */
export const GROUND_SQUASH = 1.9;

/** Each material owns a ramp of this many firelight levels (2^LEVEL_BITS). */
export const LEVEL_BITS = 3;
export const LIGHT_LEVELS = 1 << LEVEL_BITS;
export const MAX_LEVEL = LIGHT_LEVELS - 1;

/** Reach value meaning "firelight never gets here". */
export const REACH_NEVER = 255;

/** First ground row; above it are the sky and the far forest. */
export const HORIZON_Y = 38;

/** The grassy clearing, as an ellipse on screen. */
export const CLEARING = Object.freeze({ cx: 160, cy: 112, rx: 138, ry: 66 });

/** Seed for every piece of procedural layout, so the clearing never changes. */
export const WORLD_SEED = 0x46554755;
