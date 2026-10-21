// STARBOX's street window is a miniature live preview of Coffee Rising.
// Animation stays entirely inside lot 696, on the shared city clock.
export default function build(b) {
  b.loop((dt, time) => {
    const rise = 0.5 + 0.5 * Math.sin(time * 0.33);
    b.node('CoffeeLevel', { position: [0, 2.15 + rise * 0.5, -0.72] });
    b.node('CoffeeBubbles', {
      position: [1.1, 2.29 + rise * 0.5 + Math.sin(time * 2.2) * 0.025, -0.72]
    });
    b.node('CoffeePour', { scale: [1, 0.99 + Math.sin(time * 5.5) * 0.01, 1] });
  });
}
