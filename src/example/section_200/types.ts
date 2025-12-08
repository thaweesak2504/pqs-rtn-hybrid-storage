// types.ts - Type definitions for SQLite-ready document structure

/**
 * Enum for different types of nodes in the document tree
 */
export enum NodeType {
  SECTION = 'SECTION',           // Top-level section headers (e.g., "หน้าที่", "ส่วนประกอบ...")
  QUESTION = 'QUESTION',         // Main questions under a section
  SUB_QUESTION = 'SUB_QUESTION'  // Nested questions (Level 2, Level 3, etc.)
}

/**
 * Checkbox item structure for answers
 */
export interface CheckboxItem {
  checked: boolean;
  label?: string;  // e.g., "ก.", "ข."
  text?: string;   // The answer text
}

/**
 * The shape of data stored in SQLite database (Flat structure)
 */
export interface DBNode {
  id: string;
  parent_id: string | null;
  node_type: NodeType;
  content: string;
  description?: string;
  order_index: number;
  meta_data: string; // JSON string containing flexible fields
}

/**
 * The shape of data used by UI components (Tree structure)
 * This is what the React component will consume
 */
export interface UINode {
  id: string;
  type: NodeType;
  q: string;                          // Question text
  description?: string;               // Additional description text
  descriptionList?: string[];         // List of sub-items in description
  children: UINode[];                 // Nested sub-questions (recursive)

  // Checkbox-related fields
  checkboxes?: boolean[];             // Question option checkboxes (ก. ข. ค. ง.)
  answerCheckboxes?: CheckboxItem[];  // Answer checkboxes with labels

  // Display flags
  isHeader?: boolean;                 // Whether this is a section header
  optionsHeader?: boolean;            // Whether to show ก. ข. ค. ง. header

  // Additional content
  subList?: string[];                 // Sub-list items (numbered list in answers)
}

/**
 * Document metadata for SQLite storage
 */
export interface DocumentMeta {
  id: string;
  section_number: string;  // e.g., "201"
  title: string;
  references: string[];
}

/**
 * Utility function to convert DBNode[] (flat) to UINode[] (tree)
 */
export function buildTree(flatNodes: DBNode[]): UINode[] {
  const nodeMap = new Map<string, UINode>();
  const rootNodes: UINode[] = [];

  // 1. Convert all DB nodes to UI nodes
  flatNodes.forEach(dbNode => {
    const metaData = JSON.parse(dbNode.meta_data || '{}');
    const uiNode: UINode = {
      id: dbNode.id,
      type: dbNode.node_type,
      q: dbNode.content,
      description: dbNode.description,
      children: [],
      ...metaData // Unpack flexible fields (checkboxes, isHeader, etc.)
    };
    nodeMap.set(uiNode.id, uiNode);
  });

  // 2. Reconstruct hierarchy based on parent_id
  flatNodes
    .sort((a, b) => a.order_index - b.order_index)
    .forEach(dbNode => {
      const uiNode = nodeMap.get(dbNode.id)!;
      if (dbNode.parent_id) {
        const parent = nodeMap.get(dbNode.parent_id);
        if (parent) {
          parent.children.push(uiNode);
        }
      } else {
        rootNodes.push(uiNode);
      }
    });

  return rootNodes;
}

/**
 * Utility function to flatten UINode[] (tree) to DBNode[] (flat) for SQLite export
 */
export function flattenTree(
  nodes: UINode[],
  parentId: string | null = null,
  startIndex: number = 0
): DBNode[] {
  const result: DBNode[] = [];

  nodes.forEach((node, index) => {
    const { id, type, q, description, children, ...metaFields } = node;

    const dbNode: DBNode = {
      id: node.id,
      parent_id: parentId,
      node_type: node.type,
      content: node.q,
      description: node.description,
      order_index: startIndex + index,
      meta_data: JSON.stringify(metaFields)
    };

    result.push(dbNode);

    // Recursively flatten children
    if (children && children.length > 0) {
      result.push(...flattenTree(children, node.id, 0));
    }
  });

  return result;
}
