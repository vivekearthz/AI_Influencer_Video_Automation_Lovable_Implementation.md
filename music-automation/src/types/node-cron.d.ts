declare module 'node-cron' {
  export function schedule(expression: string, task: () => void): { stop(): void };
}
