"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { RepertoireTreeNode } from "@/lib/api";

type RepertoireTreeProps = {
  nodes: RepertoireTreeNode[];
  onSelectNode?: (node: RepertoireTreeNode) => void;
  selectedNodeId?: string;
};

export function RepertoireTreeView({ nodes, onSelectNode, selectedNodeId }: RepertoireTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="py-8 text-center text-neutral-500">
        No moves in repertoire yet. Add your first move!
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          onSelect={onSelectNode}
          selectedId={selectedNodeId}
        />
      ))}
    </div>
  );
}

type TreeNodeProps = {
  node: RepertoireTreeNode;
  depth: number;
  onSelect?: (node: RepertoireTreeNode) => void;
  selectedId?: string;
};

function TreeNode({ node, depth, onSelect, selectedId }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  const masteryColors = {
    new: "bg-neutral-600",
    learning: "bg-yellow-600",
    familiar: "bg-blue-600",
    mastered: "bg-green-600",
  };

  return (
    <div>
      <div
        className={clsx(
          "flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors",
          isSelected ? "bg-green-600/20" : "hover:bg-neutral-800"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect?.(node)}
        onKeyDown={(e) => e.key === "Enter" && onSelect?.(node)}
        role="button"
        tabIndex={0}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-neutral-500 hover:text-white"
          >
            {expanded ? "▼" : "▶"}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Move */}
        <span className="font-mono font-medium text-white">{node.move_san}</span>

        {/* Mastery indicator */}
        <span
          className={clsx("h-2 w-2 rounded-full", masteryColors[node.mastery_level as keyof typeof masteryColors])}
          title={node.mastery_level}
        />

        {/* Eval */}
        {node.engine_eval !== null && (
          <span
            className={clsx(
              "text-xs",
              node.engine_eval > 0.3
                ? "text-green-500"
                : node.engine_eval < -0.3
                  ? "text-red-500"
                  : "text-neutral-400"
            )}
          >
            {node.engine_eval > 0 ? "+" : ""}
            {node.engine_eval.toFixed(1)}
          </span>
        )}

        {/* Coverage */}
        {node.coverage_prob !== null && (
          <span className="text-xs text-neutral-500">
            {(node.coverage_prob * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
