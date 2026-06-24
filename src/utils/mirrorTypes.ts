import { MirrorType } from "../core/enums";
import { Mirror, ToolName } from "../core/types";

export const APPLICABLE_MIRROR_TYPES: ToolName[] = [
  MirrorType.NPM,
  MirrorType.PIP,
  MirrorType.DOCKER,
  MirrorType.GIT,
  MirrorType.APT,
];

const MIRROR_TYPE_LABELS: Record<ToolName, string> = {
  [MirrorType.NPM]: "npm",
  [MirrorType.PIP]: "pip",
  [MirrorType.DOCKER]: "Docker",
  [MirrorType.GIT]: "Git",
  [MirrorType.APT]: "APT",
  [MirrorType.MAVEN]: "Maven",
  [MirrorType.GO]: "Go",
  [MirrorType.COMPOSER]: "Composer",
  [MirrorType.NUGET]: "NuGet",
  [MirrorType.RUBYGEMS]: "RubyGems",
  [MirrorType.CARGO]: "Cargo",
};

export function getMirrorTypeLabel(type: ToolName): string {
  return MIRROR_TYPE_LABELS[type];
}

export function mirrorSupportsType(mirror: Mirror, type: MirrorType): boolean {
  if (type === MirrorType.GENERAL) {
    return false;
  }

  return (
    mirror.type.includes(type) || mirror.type.includes(MirrorType.GENERAL)
  );
}

export function filterMirrorsByType(
  mirrors: Mirror[],
  type: MirrorType,
): Mirror[] {
  return mirrors.filter((mirror) => mirrorSupportsType(mirror, type));
}
