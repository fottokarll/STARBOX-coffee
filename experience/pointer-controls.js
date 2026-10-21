/** Project 0 forwards x/y and per-contact dx/dy, but does not forward pointerId.
 * Recover the previous endpoint from the delta; retain the action from DOWN.
 * This also tracks blank contacts so they cannot release another finger's action.
 * Verified against the official shell/runtime, 349b98f4f3 (October 2026).
 */
export function createPointerControls(hit, action) {
  const contacts = [];
  const held = new Map();
  const controls = new Set(['left', 'right', 'jump']);
  function set(id, down) {
    if (!controls.has(id)) return;
    const before = held.get(id) || 0, after = Math.max(0, before + (down ? 1 : -1));
    held.set(id, after);
    if (Boolean(before) !== Boolean(after)) action(id, after > 0);
  }
  function find(event) {
    if (!event.touch) return contacts.findIndex(c => !c.touch && c.button === event.button);
    const x = event.x - (event.dx || 0), y = event.y - (event.dy || 0);
    let best = -1, distance = 2;
    contacts.forEach((contact, index) => {
      if (!contact.touch) return;
      const gap = Math.hypot(contact.x - x, contact.y - y);
      if (gap < distance) { best = index; distance = gap; }
    });
    return best;
  }
  return {
    down(event) {
      const id = hit(event.x, event.y);
      // Store first: a menu action may synchronously clear all contacts.
      contacts.push({x: event.x, y: event.y, touch: Boolean(event.touch), button: event.button, id});
      if (controls.has(id)) set(id, true);
      else if (id) action(id, true);
    },
    move(event) {
      const index = event.touch ? find(event) : contacts.findIndex(c => !c.touch);
      if (index < 0) return;
      contacts[index].x = event.x; contacts[index].y = event.y;
    },
    up(event) {
      const index = find(event);
      if (index < 0) return;
      const [contact] = contacts.splice(index, 1);
      set(contact.id, false);
    },
    clear() {
      contacts.length = 0;
      for (const [id, count] of held) if (count) action(id, false);
      held.clear();
    }
  };
}
