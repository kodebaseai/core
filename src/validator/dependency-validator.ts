import {
  CArtifact,
  INITIATIVE_ID_REGEX,
  ISSUE_ID_REGEX,
  MILESTONE_ID_REGEX,
  type TArtifactType,
} from "../constants.js";
import type { TInitiative, TIssue, TMilestone } from "../schemas/schemas.js";

export type ArtifactWithRelationships = Pick<
  TInitiative | TMilestone | TIssue,
  "metadata"
>;

type DependencyNode = {
  id: string;
  dependencies: readonly string[];
  visited: boolean;
  inStack: boolean;
};

export type CircularDependencyIssue = {
  code: "CIRCULAR_DEPENDENCY";
  cycle: string[];
  message: string;
};

export type CrossLevelDependencyIssue = {
  code: "CROSS_LEVEL_DEPENDENCY";
  sourceId: string;
  sourceType: TArtifactType;
  dependencyId: string;
  dependencyType: TArtifactType;
  message: string;
};

export type RelationshipConsistencyIssue = {
  code: "RELATIONSHIP_UNKNOWN_ARTIFACT" | "RELATIONSHIP_INCONSISTENT_PAIR";
  path: string;
  message: string;
};

function inferArtifactType(id: string): TArtifactType | null {
  if (ISSUE_ID_REGEX.test(id)) {
    return CArtifact.ISSUE;
  }
  if (MILESTONE_ID_REGEX.test(id)) {
    return CArtifact.MILESTONE;
  }
  if (INITIATIVE_ID_REGEX.test(id)) {
    return CArtifact.INITIATIVE;
  }
  return null;
}

const LABEL_BY_TYPE: Record<TArtifactType, string> = {
  [CArtifact.INITIATIVE]: "initiative",
  [CArtifact.MILESTONE]: "milestone",
  [CArtifact.ISSUE]: "issue",
};

function formatArtifactLabel(type: TArtifactType, id: string): string {
  return `${LABEL_BY_TYPE[type]} ${id}`;
}

/**
 * Detect circular dependencies in the blocked_by relationship graph.
 * Returns one issue per detected cycle, including the ordered cycle path.
 */
export function detectCircularDependencies(
  artifacts: ReadonlyMap<string, ArtifactWithRelationships>,
): CircularDependencyIssue[] {
  const nodes = new Map<string, DependencyNode>();

  for (const [id, artifact] of artifacts) {
    const blockedBy =
      artifact.metadata.relationships?.blocked_by?.slice() ?? [];
    nodes.set(id, {
      id,
      dependencies: blockedBy,
      visited: false,
      inStack: false,
    });
  }

  const issues: CircularDependencyIssue[] = [];

  const explore = (nodeId: string, path: string[]): string[] | null => {
    const node = nodes.get(nodeId);
    if (!node) {
      return null;
    }

    if (node.inStack) {
      const cycleStart = path.indexOf(nodeId);
      const cyclePath = path.slice(Math.max(0, cycleStart)).concat(nodeId);
      return cyclePath;
    }

    if (node.visited) {
      return null;
    }

    node.visited = true;
    node.inStack = true;
    path.push(nodeId);

    for (const dependencyId of node.dependencies) {
      if (!nodes.has(dependencyId)) {
        continue;
      }

      const cycle = explore(dependencyId, [...path]);
      if (cycle) {
        node.inStack = false;
        return cycle;
      }
    }

    node.inStack = false;
    return null;
  };

  for (const [id, node] of nodes) {
    if (node.visited) {
      continue;
    }

    const cycle = explore(id, []);
    if (cycle) {
      const formatted = cycle.join(" -> ");
      issues.push({
        code: "CIRCULAR_DEPENDENCY",
        cycle,
        message: `Circular dependency detected: ${formatted}`,
      });
    }
  }

  return issues;
}

export function detectCrossLevelDependencies(
  artifacts: ReadonlyMap<string, ArtifactWithRelationships>,
): CrossLevelDependencyIssue[] {
  const issues: CrossLevelDependencyIssue[] = [];

  for (const [id, artifact] of artifacts) {
    const sourceType = inferArtifactType(id);
    if (!sourceType) {
      continue;
    }

    const dependencies = artifact.metadata.relationships?.blocked_by ?? [];

    for (const dependencyId of dependencies) {
      const dependencyArtifact = artifacts.get(dependencyId);
      if (!dependencyArtifact) {
        continue;
      }

      const dependencyType = inferArtifactType(dependencyId);
      if (!dependencyType) {
        continue;
      }

      if (sourceType === dependencyType) {
        continue;
      }

      const sourceLabel = formatArtifactLabel(sourceType, id);
      const dependencyLabel = formatArtifactLabel(dependencyType, dependencyId);

      issues.push({
        code: "CROSS_LEVEL_DEPENDENCY",
        sourceId: id,
        sourceType,
        dependencyId,
        dependencyType,
        message: `Cross-level dependency detected: ${sourceLabel} cannot depend on ${dependencyLabel}.`,
      });
    }
  }

  return issues;
}

function getRelationships(artifact: ArtifactWithRelationships): {
  blocks: readonly string[];
  blocked_by: readonly string[];
} {
  const relationships = artifact.metadata.relationships;
  if (!relationships) {
    return { blocks: [], blocked_by: [] };
  }
  return relationships;
}

export function validateRelationshipConsistency(
  artifacts: ReadonlyMap<string, ArtifactWithRelationships>,
): RelationshipConsistencyIssue[] {
  const issues: RelationshipConsistencyIssue[] = [];
  const reportedPairs = new Set<string>();

  const markInconsistent = (
    sourceId: string,
    targetId: string,
    path: string,
    message: string,
  ) => {
    const key = [sourceId, targetId].sort().join("::");
    if (reportedPairs.has(key)) {
      return;
    }
    reportedPairs.add(key);
    issues.push({
      code: "RELATIONSHIP_INCONSISTENT_PAIR",
      path,
      message,
    });
  };

  for (const [id, artifact] of artifacts) {
    const relationships = getRelationships(artifact);

    relationships.blocks.forEach((targetId, index) => {
      const path = `metadata.relationships.blocks[${index}]`;
      const target = artifacts.get(targetId);
      if (!target) {
        issues.push({
          code: "RELATIONSHIP_UNKNOWN_ARTIFACT",
          path,
          message: `'${targetId}' referenced by ${id} was not found.`,
        });
        return;
      }
      const targetRelationships = getRelationships(target);
      if (!targetRelationships.blocked_by.includes(id)) {
        markInconsistent(
          id,
          targetId,
          path,
          `'${id}' lists '${targetId}' in blocks but the reciprocal blocked_by entry is missing.`,
        );
      }
    });

    relationships.blocked_by.forEach((sourceId, index) => {
      const path = `metadata.relationships.blocked_by[${index}]`;
      const source = artifacts.get(sourceId);
      if (!source) {
        issues.push({
          code: "RELATIONSHIP_UNKNOWN_ARTIFACT",
          path,
          message: `'${sourceId}' referenced by ${id} was not found.`,
        });
        return;
      }
      const sourceRelationships = getRelationships(source);
      if (!sourceRelationships.blocks.includes(id)) {
        markInconsistent(
          sourceId,
          id,
          path,
          `'${id}' lists '${sourceId}' in blocked_by but the reciprocal blocks entry is missing.`,
        );
      }
    });
  }

  return issues;
}
