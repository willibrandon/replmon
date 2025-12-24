/**
 * Raw YAML configuration file structure.
 * This is the shape of the parsed YAML before Zod validation.
 */
export interface YAMLConfigFile {
  /** Named node configurations */
  nodes?: Record<string, YAMLNodeConfig>;

  /** Enable pglogical mode */
  pglogical?: boolean;
}

/**
 * Raw node configuration from YAML.
 * Supports environment variable interpolation via ${VAR_NAME} syntax.
 */
export interface YAMLNodeConfig {
  host?: string;
  port?: number | string; // May be string before interpolation
  database?: string;
  user?: string;
  password?: string;
}
