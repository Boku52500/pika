export function wrapCarouselIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function trackScrollLeftForSlide(track: { scrollLeft: number; getBoundingClientRect: () => DOMRect }, slide: { getBoundingClientRect: () => DOMRect }): number {
  const trackBox = track.getBoundingClientRect();
  const slideBox = slide.getBoundingClientRect();
  return slideBox.left - trackBox.left + track.scrollLeft;
}
