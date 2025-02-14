import { UserConfig } from "vite";

export interface PreviewConfig {
  alias: Record<string, string>;
  publicDir: string;
  wrapper?: {
    path: string;
    componentName?: string;
  };
  frameworkPlugin?: any;
  vite?: UserConfig;
}
