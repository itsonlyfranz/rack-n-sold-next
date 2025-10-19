/**
 * Type definitions for Node.js
 * These are minimal definitions to satisfy TypeScript's module resolution
 */

// Global Node.js namespace
declare namespace NodeJS {
  interface Process {
    env: ProcessEnv;
    version: string;
    platform: string;
  }

  interface ProcessEnv {
    [key: string]: string | undefined;
    NODE_ENV?: string;
  }

  interface Global {
    process: Process;
  }
}

// Global process variable
declare var process: NodeJS.Process;

// Module definitions
declare module 'node:fs' {
  export * from 'fs';
}

declare module 'node:path' {
  export * from 'path';
}

declare module 'node:util' {
  export * from 'util';
}

declare module 'fs' {
  export function readFileSync(path: string, options?: { encoding?: string; flag?: string } | string): string | Buffer;
  export function writeFileSync(path: string, data: string | Buffer, options?: { encoding?: string; flag?: string } | string): void;
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
}

declare module 'util' {
  export function promisify<T>(fn: Function): (...args: any[]) => Promise<T>;
  export function inspect(obj: any, options?: any): string;
} 