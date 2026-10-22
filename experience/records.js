/** Personal records use the documented p0.saved/p0.save API; guests keep session records. */
export function readRecords(saved) {
  const records = {};
  for (const recipe of ['espresso', 'latte']) {
    const data = saved?.starbox?.bests?.[recipe];
    records[recipe] = {progress: Math.min(1, Math.max(0, Number(data?.progress) || 0)),
      height: Math.max(0, Number(data?.height) || 0),
      time: Number.isFinite(data?.time) && data.time > 0 ? data.time : null};
  }
  return records;
}
export function keepRecord(records, result) {
  const previous = records[result.recipe] || {progress: 0, height: 0, time: null};
  const next = {progress: Math.max(previous.progress, result.progress),
    height: Math.max(previous.height, result.bestHeight),
    time: result.success ? Math.min(previous.time || Infinity, result.time) : previous.time};
  return {...records, [result.recipe]: next};
}
