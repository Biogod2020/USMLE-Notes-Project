// src/components/CustomNode.tsx
import { memo } from 'react';
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
};

// FIX 2: 将 CustomNodeData 应用到 NodeProps 泛型上
const CustomNode = ({ data }: NodeProps<Node<CustomNodeData>>) => {
  const isCenterClass = data.isCenter ? 'is-center' : '';

  return (
    <div className={`custom-node-body type-${data.type} ${isCenterClass}`}>
      <Handle type="source" position={Position.Top} style={{ visibility: 'hidden', top: '-8px', width: '10px', height: '10px' }} />
      <Handle type="target" position={Position.Bottom} style={{ visibility: 'hidden', bottom: '-8px', width: '10px', height: '10px' }} />

      <div className="node-header">
          <span className="node-icon">{getEmoji(data.type)}</span>
          <span className="node-type">{data.type}</span>
      </div>
      <div className="node-title">{data.title}</div>
    </div>
  );
};

export default memo(CustomNode);