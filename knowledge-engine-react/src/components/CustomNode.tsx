// src/components/CustomNode.tsx
import { memo } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { type NodeProps, Handle, Position, type Node } from '@xyflow/react';

const EMOJI_MAP: Record<string, string> = {
  disease: '🦠', structure: '🏛️', process: '⚙️',
  substance: '🧪', finding: '❗', concept: '💡',
};
const getEmoji = (type: string) => EMOJI_MAP[type] || '📄';

// FIX 1: 定义 data 对象的具体类型
type CustomNodeData = {
  title: string;
  type: string;
  isCenter: boolean;
  isExpanded?: boolean;
  onActivate?: () => void;
  onToggleExpand?: () => void;
};

// FIX 2: 将 CustomNodeData 应用到 NodeProps 泛型上
const CustomNode = ({ data }: NodeProps<Node<CustomNodeData>>) => {
  const isCenterClass = data.isCenter ? 'is-center' : '';

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && data.onActivate) {
      event.preventDefault();
      data.onActivate();
    }
    if ((event.key === 'e' || event.key === 'E') && data.onToggleExpand) {
      event.preventDefault();
      data.onToggleExpand();
    }
  };

  return (
    <div
      className={`custom-node-body type-${data.type} ${isCenterClass}`}
      tabIndex={0}
      role="button"
      aria-label={`${data.title} node`}
      onKeyDown={handleKeyDown}
    >
      <Handle type="source" position={Position.Top} style={{ visibility: 'hidden', top: '-8px', width: '10px', height: '10px' }} />
      <Handle type="target" position={Position.Bottom} style={{ visibility: 'hidden', bottom: '-8px', width: '10px', height: '10px' }} />

      <div className="node-header">
          <span className="node-icon">{getEmoji(data.type)}</span>
          <span className="node-type">{data.type}</span>
          {data.onToggleExpand && (
            <button
              type="button"
              className="node-expand-btn"
              onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(); }}
              aria-pressed={data.isExpanded}
              title={data.isExpanded ? 'Collapse node' : 'Expand node'}
            >
              {data.isExpanded ? '−' : '+'}
            </button>
          )}
      </div>
      <div className="node-title">{data.title}</div>
    </div>
  );
};

export default memo(CustomNode);