void p0Surface(inout P0Surface s) {
  float steam = 0.5 + 0.5 * sin(s.position.y * 3.0 - p0Time * 0.9);
  s.alpha *= 0.90 + 0.10 * steam;
  s.roughness = 0.18;
}
