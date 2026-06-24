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
  selectedMirrorsByType: Map<MirrorType, Mirror>;
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
    url: "https://mirror.shatel.ir",
    name: "Shatel",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Shatel",
      notes: "Ubuntu, Debian, Kali",
    },
  },
  {
    url: "https://mirrors.kubarcloud.com",
    name: "KubarCloud",
    type: [MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "KubarCloud",
      notes: "Linux kernel, Debian, Ubuntu, Alpine, Arch Linux",
    },
  },
  {
    url: "https://repo-portal.ito.gov.ir/repo",
    name: "ITO (Information Technology Organization)",
    type: [MirrorType.NPM, MirrorType.PIP, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "ITO",
      notes: "YUM/DNF (CentOS, Fedora, Rocky), Python, npm, Yarn",
    },
  },
  {
    url: "https://jamko.ir",
    name: "Jamko",
    type: [
      MirrorType.MAVEN,
      MirrorType.NUGET,
      MirrorType.COMPOSER,
      MirrorType.PIP,
      MirrorType.APT,
      MirrorType.GENERAL,
    ],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Jamko",
      notes: "Maven, Gradle, Android SDK, APT, RPM, NuGet, Yarn, Composer, pip",
    },
  },
  {
    url: "https://runflare.com/mirrors",
    name: "Runflare",
    type: [
      MirrorType.NPM,
      MirrorType.PIP,
      MirrorType.COMPOSER,
      MirrorType.GENERAL,
    ],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Runflare",
      notes: "Composer/Packagist, PyPI, npm, Node.js",
    },
  },
  {
    url: "https://hamravesh.com/blog/container-registry-mirroring-and-caching/",
    name: "Hamravesh",
    type: [
      MirrorType.DOCKER,
      MirrorType.NPM,
      MirrorType.PIP,
      MirrorType.GO,
      MirrorType.NUGET,
      MirrorType.MAVEN,
      MirrorType.APT,
      MirrorType.GENERAL,
    ],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Hamravesh",
      notes:
        "Docker, Microsoft, Google, Quay, Elastic, npm, PyPI, Go, NuGet, Maven, Alpine, Debian, Ubuntu",
    },
  },
  {
    url: "https://repo.iut.ac.ir",
    name: "IUT (Isfahan University of Technology)",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Isfahan University of Technology",
      notes:
        "Debian, Ubuntu, Mint, Arch, Manjaro, Alpine, Rocky, Fedora, OpenSUSE, OpenBSD, CTAN",
    },
  },
  {
    url: "https://maven.myket.ir",
    name: "Myket Maven",
    type: [MirrorType.MAVEN],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Myket",
      notes: "Maven Central, Google Maven, JitPack",
    },
  },
  {
    url: "https://www.arvancloud.ir/en/dev/linux-repository",
    name: "ArvanCloud Linux",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "ArvanCloud",
      notes: "Debian, Ubuntu, CentOS, Alpine, Arch, OpenSUSE, Manjaro",
    },
  },
  {
    url: "https://mirror.iranserver.com",
    name: "IranServer",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "IranServer",
      notes: "Debian, Ubuntu, CentOS",
    },
  },
  {
    url: "https://docker.mobinhost.com",
    name: "MobinHost Docker",
    type: [MirrorType.DOCKER],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "MobinHost",
      notes: "Docker Registry",
    },
  },
  {
    url: "https://www.arvancloud.ir/fa/dev/docker",
    name: "ArvanCloud Docker",
    type: [MirrorType.DOCKER],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "ArvanCloud",
      notes: "Docker Registry",
    },
  },
  {
    url: "https://focker.ir",
    name: "Focker",
    type: [MirrorType.DOCKER],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Focker",
      notes: "Docker Registry",
    },
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
      MirrorType.APT,
      MirrorType.GENERAL,
    ],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Liara",
      notes:
        "Debian, Ubuntu, CentOS, Fedora, Rocky, Alpine, OpenSUSE, Arch, Manjaro, PyPI, npm, Go, NuGet, Composer, Docker",
    },
  },
  {
    url: "https://mirror.mobinhost.com",
    name: "MobinHost Full",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "MobinHost",
      notes:
        "FreeBSD, AlmaLinux, Alpine, Arch, Debian, EPEL, Manjaro, MariaDB, MongoDB, Ubuntu, Zabbix",
    },
  },
  {
    url: "https://en-mirror.ir",
    name: "EN Mirror",
    type: [MirrorType.MAVEN],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "EN Mirror",
      notes: "Google Maven, Maven Central, JitPack",
    },
  },
  {
    url: "https://terraform.peaker.info",
    name: "Terraform Peaker",
    type: [MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Peaker",
      notes: "Terraform",
    },
  },
  {
    url: "http://mirror.afranet.com",
    name: "Afranet",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Afranet",
      notes: "Debian, Ubuntu, CentOS",
    },
  },
  {
    url: "https://ubuntu.pishgaman.net",
    name: "Pishgaman Ubuntu",
    type: [MirrorType.APT],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Pishgaman",
      notes: "Ubuntu",
    },
  },
  {
    url: "https://mirrors.pardisco.co",
    name: "Pardisco Mirrors",
    type: [
      MirrorType.NPM,
      MirrorType.PIP,
      MirrorType.DOCKER,
      MirrorType.GO,
      MirrorType.NUGET,
      MirrorType.APT,
      MirrorType.GENERAL,
    ],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Pardisco",
      notes: "Ubuntu, Debian, Alpine, PyPI, npm, Go, NuGet, Docker, OmniOS",
    },
  },
  {
    url: "https://cran.um.ac.ir",
    name: "CRAN UM",
    type: [MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "University of Mashhad",
      notes: "R (CRAN)",
    },
  },
  {
    url: "https://ir.archive.ubuntu.com/ubuntu",
    name: "Ubuntu Official Iran",
    type: [MirrorType.APT],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Ubuntu Official",
      notes: "Ubuntu",
    },
  },
  {
    url: "https://mirror.0-1.cloud",
    name: "0-1 Cloud Mirror",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "0-1 Cloud",
      notes:
        "AlmaLinux, Alpine, Arch, Debian, Fedora, FreeBSD, Ubuntu, Windows",
    },
  },
  {
    url: "http://mirror.manageit.ir/ubuntu",
    name: "ManageIT Ubuntu",
    type: [MirrorType.APT],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "ManageIT",
      notes: "Ubuntu",
    },
  },
  {
    url: "http://mirror.aminidc.com",
    name: "Aminidc",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Aminidc",
      notes: "Debian, RHEL, Rocky, Ubuntu, Windows Server",
    },
  },
  {
    url: "https://ubuntu-mirror.kimiahost.com",
    name: "KimiaHost Ubuntu",
    type: [MirrorType.APT],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "KimiaHost",
      notes: "Ubuntu",
    },
  },
  {
    url: "https://mirror.digitalvps.ir/ubuntu",
    name: "DigitalVPS Ubuntu",
    type: [MirrorType.APT],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "DigitalVPS",
      notes: "Ubuntu",
    },
  },
  {
    url: "https://ir.ubuntu.sindad.cloud",
    name: "Sindad Ubuntu",
    type: [MirrorType.APT],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Sindad",
      notes: "Ubuntu",
    },
  },
  {
    url: "https://ir.centos.sindad.cloud",
    name: "Sindad CentOS",
    type: [MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Sindad",
      notes: "CentOS",
    },
  },
  {
    url: "https://ir.epel.sindad.cloud",
    name: "Sindad EPEL",
    type: [MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Sindad",
      notes: "EPEL",
    },
  },
  {
    url: "http://mirror.faraso.org",
    name: "Faraso",
    type: [MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Faraso",
      notes: "CentOS, EPEL, Java Runtime, Java Dev",
    },
  },
  {
    url: "https://chat.shhh.ir/dl",
    name: "DeltaChat",
    type: [MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "DeltaChat",
      notes: "DeltaChat",
    },
  },
  {
    url: "https://mirror.atlantiscloud.ir",
    name: "AtlantisCloud",
    type: [
      MirrorType.NPM,
      MirrorType.DOCKER,
      MirrorType.APT,
      MirrorType.GENERAL,
    ],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "AtlantisCloud",
      notes: "Ubuntu, Docker Registry, npm",
    },
  },
  {
    url: "https://iran.chabokan.net",
    name: "Chabokan",
    type: [
      MirrorType.NPM,
      MirrorType.PIP,
      MirrorType.DOCKER,
      MirrorType.NUGET,
      MirrorType.GENERAL,
    ],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Chabokan",
      notes: "npm, Python, PHP, Docker, NuGet",
    },
  },
  {
    url: "https://repo.abrha.net",
    name: "Abrha",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Abrha",
      notes: "Ubuntu, AlmaLinux, Debian, EPEL, Proxmox",
    },
  },
  {
    url: "https://mirror.parsdev.com",
    name: "ParsDev",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "ParsDev",
      notes: "Ubuntu, AlmaLinux, Debian",
    },
  },
  {
    url: "https://linuxmirrors.ir",
    name: "LinuxMirrors",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "LinuxMirrors",
      notes: "Debian, Ubuntu, Fedora, Rocky, Oracle Linux",
    },
  },
  {
    url: "https://mvnhub.ir",
    name: "Maven Hub",
    type: [MirrorType.MAVEN],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "Maven Hub",
      notes: "Maven Central",
    },
  },
  {
    url: "https://pub.pubyar.ir",
    name: "PubYar",
    type: [MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "IR",
      provider: "PubYar",
      notes: "Dart Pub, Flutter packages",
    },
  },
  {
    url: "https://mirror.freedif.org/",
    name: "FreeDif",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "SG",
      provider: "FreeDif",
      notes:
        "Termux, F-Droid, Chaotic-AUR, Ubuntu, Debian, Fedora, LinuxMint, Manjaro, Arch, Void, Alpine, AlmaLinux, Rocky, Kali, TorProject",
    },
  },
  {
    url: "https://mirrors.mit.edu",
    name: "MIT",
    type: [MirrorType.APT, MirrorType.GENERAL],
    status: MirrorStatus.UNKNOWN,
    metadata: {
      country: "US",
      provider: "MIT",
      notes:
        "ArchLinux, CentOS, CPAN, CTAN, Cygwin, Debian, Fedora, EPEL, Finnix, FreeBSD, Gentoo, KDE, Kernel, NetBSD, OpenBSD, Parrot, Raspbian, Sage, Tails, Tor, Ubuntu",
    },
  },
];
