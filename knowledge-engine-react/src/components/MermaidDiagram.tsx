import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// mermaid.initialize removed - handled per-render for dynamic theming

// Override parseError to prevent it from logging to UI or blocking
mermaid.parseError = (err) => {
    // We handle errors via the catch block in renderDiagram
    console.debug('Mermaid Parse Error suppressed:', err);
};

interface Props {
  definition: string;
}

export default function MermaidDiagram({ definition }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [currentDefinition, setCurrentDefinition] = useState<string>(definition);

  useEffect(() => {
    let isMounted = true;
    
    // Reset state when definition prop changes
    setCurrentDefinition(definition);
    setError(null);
    setSvg('');

    const renderDiagram = async (codeToRender: string, isRetry = false) => {
      if (!codeToRender) return;
      
      try {
        // [New] Dynamic Theme Configuration
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const css = getComputedStyle(document.documentElement);
        
        // Use 'base' theme to allow overriding via variables
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base', 
            securityLevel: 'loose',
            suppressErrorRendering: true,
            themeVariables: {
                // Use BG colors for fills to ensure text contrast
                primaryColor: css.getPropertyValue(isDark ? '--c-anatomy-bg-dark' : '--c-anatomy-bg-light').trim(),
                primaryTextColor: css.getPropertyValue('--text-color').trim(),
                primaryBorderColor: css.getPropertyValue(isDark ? '--c-anatomy-dark' : '--c-anatomy-light').trim(),
                lineColor: css.getPropertyValue('--text-muted').trim(),
                secondaryColor: css.getPropertyValue(isDark ? '--c-disease-bg-dark' : '--c-disease-bg-light').trim(),
                tertiaryColor: css.getPropertyValue(isDark ? '--bg-alt-dark' : '--bg-alt-light').trim(),
                fontFamily: css.getPropertyValue('--font-main').trim(),
                fontSize: '14px',
                darkMode: isDark,
                background: 'transparent',
                mainBkg: 'transparent', // Make background transparent
            }
        });

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        // mermaid.render returns an object { svg } in newer versions
        const { svg: renderResult } = await mermaid.render(id, codeToRender);
        
        if (isMounted) {
            setSvg(renderResult);
            setError(null);
        }
      } catch (err) {
        if (!isRetry && isMounted) {
            console.warn("Mermaid rendering failed, attempting auto-repair:", err);
            // Attempt auto-repair once
            const repairedCode = repairMermaidCode(codeToRender);
            if (repairedCode !== codeToRender) {
                console.log("Auto-repair applied. Retrying...");
                setCurrentDefinition(repairedCode); // Update displayed code to repaired version if successful
                await renderDiagram(repairedCode, true);
                return;
            }
        }

        if (isMounted) {
          console.error("Mermaid final rendering failure:", err);
          // Mermaid often leaves an error svg in the DOM or logs to console
          // We can display a fallback message
          setError('Failed to render diagram.');
        }
      }
    };

    // Small timeout to allow DOM to be ready if needed
    // setTimeout(() => renderDiagram(definition), 0);
    renderDiagram(definition);

    return () => {
      isMounted = false;
    };
  }, [definition]);

  /**
   * Attempts to fix common Mermaid syntax errors by aggressively quoting node labels.
   * Uses a robust character scanner to handle nested chars (like parens in brackets)
   * and properly correctly identifies node boundaries vs arrows.
   */
  const repairMermaidCode = (code: string): string => {
    let result = '';
    let i = 0;
    
    // Stack of expected closing delimiters
    // e.g. ']' or ')'
    const stack: string[] = [];
    
    // To handle quoting content buffer
    let contentStart = -1;

    while (i < code.length) {
      const char = code[i];
      const nextChar = code[i + 1] || '';
      
      // If we are currently capturing content (stack not empty)
      if (stack.length > 0) {
        const expectedClose = stack[stack.length - 1];
        
        // Check if we found the closing delimiter
        let isClose = false;
        let closeLen = 1;
        
        if (expectedClose.length === 2 && char === expectedClose[0] && nextChar === expectedClose[1]) {
            isClose = true;
            closeLen = 2;
        } else if (expectedClose.length === 1 && char === expectedClose) {
            isClose = true;
            closeLen = 1;
        }

        if (isClose) {
             // Found closer.
             // Extract content
             const content = code.substring(contentStart, i);
             
             // Check if content is already quoted (starts with ")
             let newContent = content;
             if (!content.trim().startsWith('"')) {
                 // Needs quoting.
                 // Escape internal quotes
                 const escaped = content.replace(/"/g, "'");
                 newContent = `"${escaped}"`;
             }
             
             result += newContent;
             result += expectedClose; // append closer
             
             stack.pop();
             contentStart = -1;
             i += closeLen;
             continue;
        } else {
             // Just part of content, continue scanning
             i++;
             continue;
        }
      } 
      
      // NOT in a node text capturing mode. Looking for start delimiters.
      
      
      // Check double openers first (Shape: Circle, Rhombus, etc)
      if (char === '(' && nextChar === '(') {
          stack.push('))');
          result += '((';
          contentStart = i + 2;
          i += 2; 
      } else if (char === '{' && nextChar === '{') {
          stack.push('}}');
          result += '{{';
          contentStart = i + 2;
          i += 2; 
      } else if (char === '[' && nextChar === '[') { 
          stack.push(']]');
          result += '[[';
          contentStart = i + 2;
          i += 2; 
      } 
      // Single openers
      else if (char === '[') {
          stack.push(']');
          result += '[';
          contentStart = i + 1;
          i += 1; 
      } else if (char === '(') {
          stack.push(')');
          result += '(';
          contentStart = i + 1;
          i += 1; 
      } else if (char === '{') {
          stack.push('}');
          result += '{';
          contentStart = i + 1;
          i += 1; 
      } else if (char === '>') {
          // Asymmetric shape id>label]
          // MUST NOT be arrow. Arrow check: check prev char.
          const prev = i > 0 ? code[i - 1] : '';
          // Common arrows: -->, -.->, ==>, --o, etc. Often - or = or . precedes >
          if (prev === '-' || prev === '=' || prev === '.') {
              // It's an arrow end, NOT a node start.
              result += char;
              i++; 
          } else {
              // It's a node shape start
              stack.push(']'); // Asymmetric shape closes with ]
              result += '>';
              contentStart = i + 1;
              i += 1; 
          }
      } else {
          // Normal char (e.g. node ID, arrow line, etc)
          result += char;
          i++;
      }
    }
    
    // Safety: If stack is not empty (unclosed node), we might lose the end.
    // Just append the rest of the code from contentStart?
    // Mermaid would error anyway, but let's try to preserve.
    if (stack.length > 0 && contentStart !== -1) {
        result += code.substring(contentStart);
    }
    
    return result;
  };

  const toggleZoom = () => {
    // Only allow zoom if SVG is loaded
    if (svg) setIsZoomed(!isZoomed);
  };
  
  const [isZoomed, setIsZoomed] = useState(false);

  if (error) {
    return (
        <div className="mermaid-error" style={{ 
            color: 'var(--text-color)', 
            padding: '1rem', 
            border: '1px dashed var(--error-color, red)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-alt-color)'
        }}>
            <strong style={{ color: 'var(--error-color, red)' }}>Diagram Error:</strong> {error}
            <div style={{ margin: '0.5rem 0', fontSize: '0.9em', opacity: 0.8 }}>
                The raw Mermaid code is shown below:
            </div>
            <pre style={{ 
                background: 'var(--bg-color)', 
                padding: '0.5rem', 
                overflowX: 'auto',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85em'
            }}>
{currentDefinition}
            </pre>
        </div>
    );
  }

  return (
    <>
        <div 
            ref={containerRef} 
            className="mermaid-diagram" 
            onClick={toggleZoom}
            dangerouslySetInnerHTML={{ __html: svg }} 
            title="Click to zoom"
            style={{ 
                textAlign: 'center', 
                margin: '1rem 0', 
                cursor: 'zoom-in',
                padding: '1rem',
                background: 'var(--bg-alt-color)',
                borderRadius: 'var(--radius-md)'
            }}
        />
        
        {isZoomed && (
            <div 
                className="mermaid-zoom-overlay" 
                onClick={toggleZoom}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'auto',
                    padding: '1rem'
                }}
            >
                <div 
                    dangerouslySetInnerHTML={{ __html: svg }} 
                    style={{
                        maxWidth: 'none', // Allow full expansion
                        maxHeight: 'none',
                        transform: 'scale(1.5)', // Initial slight zoom
                        background: 'white', // Ensure transparent diagrams have bg in dark mode if needed
                        padding: '2rem',
                        borderRadius: '8px'
                    }}
                    onClick={e => e.stopPropagation()} // Prevent closing when clicking content? Actually allow closing for ease.
                />
                <button 
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: 'white',
                        fontSize: '2rem',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                        borderRadius: '50%'
                    }}
                    onClick={toggleZoom}
                >
                    &times;
                </button>
            </div>
        )}
    </>
  );
}
