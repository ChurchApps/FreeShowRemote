declare module 'expo-clipboard' {
  export function setStringAsync(text: string): Promise<void>;
  export function getStringAsync(): Promise<string>;
  const _default: {
    setStringAsync: typeof setStringAsync;
    getStringAsync: typeof getStringAsync;
  };
  export default _default;
}
