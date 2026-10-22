/** A new round requires a fresh press, even when retry itself is held down. */
export function createInputLatch() {
  const blocked=new Set();
  let blockedPad=false;
  return {
    capture(keys,padDown=false) {
      blocked.clear();for(const code of keys)blocked.add(code);
      blockedPad=padDown;
    },
    release(code) {blocked.delete(code);},
    read(keys,padDown=false) {
      for(const code of blocked)if(!keys.has(code))blocked.delete(code);
      if(!padDown)blockedPad=false;
      return {down:code=>keys.has(code)&&!blocked.has(code),padJump:padDown&&!blockedPad};
    }
  };
}
