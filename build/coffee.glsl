void p0Surface(inout P0Surface s) {
  float wave = sin(s.position.x * 6.0 + p0Time * 2.5)
             * sin(s.position.z * 5.0 - p0Time * 1.8);
  float ribbon = 0.5 + 0.5 * sin(s.position.y * 25.0 - p0Time * 13.0);
  s.color *= 0.85 + wave * 0.12 + ribbon * 0.12;
  s.roughness = 0.32;
}
