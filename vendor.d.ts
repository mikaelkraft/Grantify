declare module 'hypher' {
  export default class Hypher {
    constructor(patterns: any);
    hyphenateText(text: string): string;
  }
}

declare module 'hyphenation.en-us' {
  const patterns: any;
  export default patterns;
}
