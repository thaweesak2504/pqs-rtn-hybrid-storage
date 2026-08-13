/**
 * Shared focus treatment for command buttons.
 *
 * Keep this deliberately restrained: the previous Modal-only white ring used
 * two pixels plus a two-pixel offset and looked heavier than the surrounding
 * controls. One pixel plus a one-pixel offset remains visible in light/dark
 * modes without changing the product's visual weight.
 */
export const COMMAND_BUTTON_FOCUS =
  "focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-300 focus:ring-offset-1 focus:ring-offset-github-bg-secondary";
