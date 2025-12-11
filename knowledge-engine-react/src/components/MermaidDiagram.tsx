import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
});

interface Props {
  definition: string;
}

export default function MermaidDiagram({ definition }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const renderDiagram = async () => {
      if (!definition) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        // mermaid.render returns an object { svg } in newer versions
        const { svg: renderResult } = await mermaid.render(id, definition);
        
        if (isMounted) {
            setSvg(renderResult);
            setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Mermaid rendering failed:", err);
          // Mermaid often leaves an error svg in the DOM or logs to console
          // We can display a fallback message
          setError('Failed to render diagram.');
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [definition]);

  if (error) {
    return <div className="mermaid-error" style={{ color: 'red', padding: '1rem', border: '1px dashed red' }}>{error} <pre>{definition}</pre></div>;
  }

  return (
    <div 
        ref={containerRef} 
        className="mermaid-diagram" 
        dangerouslySetInnerHTML={{ __html: svg }} 
        style={{ textAlign: 'center', margin: '1rem 0' }}
    />
  );
}
