declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: { runScripts?: string, url?: string })
    window: Window & { document: Document, Event: typeof Event }
  }
}

