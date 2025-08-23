export const randomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
}

export const maxDefined=(nums: Array<number | null | undefined>)=> {
  const arr = nums.filter((n): n is number => n != null);
  return arr.length ? Math.max(...arr) : undefined;
}
export const minDefined=(nums: Array<number | null | undefined>)=> {
  const arr = nums.filter((n): n is number => n != null);
  return arr.length ? Math.min(...arr) : undefined;
}
export const modeDefined=(vals: Array<string | null | undefined>) =>{
  const arr = vals.filter((v): v is string => !!v);
  if (!arr.length) return undefined;
  const counts = arr.reduce((m, v) => (m.set(v, (m.get(v) ?? 0) + 1), m), new Map<string, number>());
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
export const anyTrue=(bools: Array<boolean | null | undefined>) =>{
  return bools.some(b => b === true) ? true : undefined;
}