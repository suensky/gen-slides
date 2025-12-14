/// <reference types="vite/client" />

// YAML raw import support
declare module '*.yaml?raw' {
    const content: string;
    export default content;
}

declare module '*.yml?raw' {
    const content: string;
    export default content;
}
