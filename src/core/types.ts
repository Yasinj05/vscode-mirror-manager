import { LogLevel, ManagerState, MirrorStatus, MirrorType } from "./enums";

export interface Mirror {
  url: string;
  name: string;
  type: MirrorType[];
  status: MirrorStatus;
  latency?: number;
  error?: string;
  lastTested?: Date;
  isSelected?: boolean;
  metadata?: MirrorMetadata;
}

export interface MirrorMetadata {
  country?: string;
  provider?: string;
  uptime?: number;
  lastUpdated?: string;
  contact?: string;
  notes?: string;
}

export interface MirrorTestResult {
  mirror: Mirror;
  reachable: boolean;
  latency: number;
  packageFound?: boolean;
  error?: string;
}

export interface IntegrationConfig {
  [MirrorType.NPM]: boolean;
  [MirrorType.PIP]: boolean;
  [MirrorType.DOCKER]: boolean;
  [MirrorType.GIT]: boolean;
  [MirrorType.APT]: boolean;
  [MirrorType.MAVEN]: boolean;
  [MirrorType.GO]: boolean;
  [MirrorType.COMPOSER]: boolean;
  [MirrorType.NUGET]: boolean;
  [MirrorType.RUBYGEMS]: boolean;
  [MirrorType.CARGO]: boolean;
  [key: string]: boolean;
}

export interface Profile {
  name: string;
  description?: string;
  integrations: IntegrationConfig;
  autoSwitch: boolean;
  checkInterval: number;
  timeout: number;
}

export interface ExtensionConfig {
  enabled: boolean;
  autoSwitch: boolean;
  autoCheckInterval: number;
  timeout: number;
  integrations: IntegrationConfig;
  activeProfile?: string;
  profiles: Profile[];
  manualMirror?: string;
  logLevel: LogLevel;
  mirrorSources: string[];
}

export interface HealthCheckResult {
  mirror: Mirror;
  healthy: boolean;
  latency: number;
  timestamp: Date;
  error?: string;
}

export interface MirrorManagerState {
  mirrors: Mirror[];
  selectedMirror: Mirror | null;
  isTesting: boolean;
  lastTest: Date | null;
  testCache: Map<string, MirrorTestResult>;
  status: ManagerState;
  lastError?: string;
}

export interface MirrorSource {
  name: string;
  url: string;
  format: "yaml" | "json" | "text";
  enabled: boolean;
  priority?: number;
}

export type ToolName =
  | MirrorType.NPM
  | MirrorType.PIP
  | MirrorType.DOCKER
  | MirrorType.GIT
  | MirrorType.APT
  | MirrorType.MAVEN
  | MirrorType.GO
  | MirrorType.COMPOSER
  | MirrorType.NUGET
  | MirrorType.RUBYGEMS
  | MirrorType.CARGO;

export type LogLevelString = "error" | "warn" | "info" | "debug";

export type StatusString =
  | "unknown"
  | "healthy"
  | "slow"
  | "unavailable"
  | "error";

export const DEFAULT_CONFIG: Partial<ExtensionConfig> = {
  enabled: true,
  autoSwitch: true,
  autoCheckInterval: 30,
  timeout: 10000,
  logLevel: LogLevel.INFO,
  mirrorSources: [
    "https://raw.githubusercontent.com/MiravaOrg/Mirava/main/mirrors_list.yaml",
  ],
  integrations: {
    [MirrorType.NPM]: true,
    [MirrorType.PIP]: true,
    [MirrorType.DOCKER]: true,
    [MirrorType.GIT]: true,
    [MirrorType.APT]: false,
    [MirrorType.MAVEN]: false,
    [MirrorType.GO]: false,
    [MirrorType.COMPOSER]: false,
    [MirrorType.NUGET]: false,
    [MirrorType.RUBYGEMS]: false,
    [MirrorType.CARGO]: false,
  },
  profiles: [],
};

export const DEFAULT_MIRRORS: Mirror[] = [
  {
    url: "https://mirror.shatel.ir/ubuntu/",
    name: "Shatel",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: { country: "IR", provider: "Shatel" },
  },
  {
    url: "https://repo-portal.ito.gov.ir/repo",
    name: "ITO Portal",
    type: [MirrorType.NPM, MirrorType.PIP, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: { country: "IR", provider: "ITO" },
  },
  {
    url: "https://hub.hamdocker.ir",
    name: "HamDocker",
    type: [MirrorType.DOCKER],
    status: MirrorStatus.UNKNOWN,
    metadata: { country: "IR", provider: "HamDocker" },
  },
  {
    url: "https://repo.iut.ac.ir",
    name: "IUT Mirror",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: { country: "IR", provider: "Isfahan University of Technology" },
  },
  {
    url: "https://liara.ir/mirrors",
    name: "Liara",
    type: [
      MirrorType.NPM,
      MirrorType.PIP,
      MirrorType.DOCKER,
      MirrorType.GO,
      MirrorType.COMPOSER,
      MirrorType.NUGET,
      MirrorType.GENERAL,
    ],
    status: MirrorStatus.UNKNOWN,
    metadata: { country: "IR", provider: "Liara" },
  },
  {
    url: "https://mirrors.pardisco.co",
    name: "Pardisco",
    type: [
      MirrorType.NPM,
      MirrorType.PIP,
      MirrorType.DOCKER,
      MirrorType.GO,
      MirrorType.NUGET,
      MirrorType.GENERAL,
    ],
    status: MirrorStatus.UNKNOWN,
    metadata: { country: "IR", provider: "Pardisco" },
  },
];
