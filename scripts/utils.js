/**
 * Creates a promise that resolves after a specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
