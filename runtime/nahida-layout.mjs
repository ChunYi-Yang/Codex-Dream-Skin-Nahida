export function resolveNahidaLayout({ width, height, composerHeight = 140, page, reducedMotion = false }) {
  const available = height - Math.max(140, composerHeight) - 220;
  let heroMode = "off";
  if (page === "home" && Number.isFinite(width) && Number.isFinite(height)) {
    if (width >= 900 && height >= 760 && available >= 260) heroMode = "full";
    else if (width >= 640 && height >= 600 && available >= 200) heroMode = "compact";
  }
  const showPortrait = heroMode !== "off";
  return { heroMode, showPortrait, showParticles: heroMode === "full" && !reducedMotion };
}
