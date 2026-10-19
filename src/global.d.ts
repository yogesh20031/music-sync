// The YouTube IFrame API attaches itself to window once its script loads.
declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export {};

// Lets a component drive a CSS custom property (e.g. slider fill) without a cast.
declare module "react" {
  interface CSSProperties {
    "--fill"?: string;
  }
}
