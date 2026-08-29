export function wrapCarouselIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

/** Scroll position that aligns a slide to the start of the track (includes gap via offsetLeft). */
export function scrollLeftForSlide(track: HTMLElement, slide: HTMLElement): number {
  return slide.offsetLeft;
}

/** @deprecated Use scrollLeftForSlide — kept for tests referencing geometry helpers. */
export function trackScrollLeftForSlide(
  track: { scrollLeft: number; getBoundingClientRect: () => DOMRect },
  slide: { getBoundingClientRect: () => DOMRect },
): number {
  const trackBox = track.getBoundingClientRect();
  const slideBox = slide.getBoundingClientRect();
  return slideBox.left - trackBox.left + track.scrollLeft;
}

/** Index of the slide whose start edge is closest to the current scroll position. */
export function closestSlideIndex(
  scrollLeft: number,
  slideOffsets: number[],
): number {
  if (slideOffsets.length === 0) return 0;
  let closest = 0;
  let minDistance = Infinity;
  for (let i = 0; i < slideOffsets.length; i++) {
    const distance = Math.abs(slideOffsets[i]! - scrollLeft);
    if (distance < minDistance) {
      minDistance = distance;
      closest = i;
    }
  }
  return closest;
}
