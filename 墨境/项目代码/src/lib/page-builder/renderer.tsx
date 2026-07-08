'use client';
import { PageComponent } from './types';

interface RenderProps {
  component: PageComponent
  onSelect?: (id: string) => void
  selectedId?: string
}

function RenderComponent({ component, onSelect, selectedId }: RenderProps) {
  const { type, props, children } = component;
  const style: React.CSSProperties = {
    color: props.color,
    backgroundColor: props.bgColor,
    fontSize: props.fontSize ? `${props.fontSize}px` : undefined,
    width: props.width,
    height: props.height,
    padding: props.padding?.map(p => `${p}px`).join(' '),
    margin: props.margin?.map(p => `${p}px`).join(' '),
    borderRadius: props.borderRadius,
  };

  const inner = (() => {
    switch (type) {
      case 'heading':
        return <h2 style={style}>{props.text}</h2>;
      case 'text':
        return <p style={style}>{props.text}</p>;
      case 'button':
        return <button style={style} onClick={() => props.href && window.location.assign(props.href)}>{props.text}</button>;
      case 'image':
        return <img src={props.src} alt="" style={{ ...style, objectFit: 'cover' as const }} />;
      case 'box':
        return <div style={style}>{children?.map(c => <RenderComponent key={c.id} component={c} onSelect={onSelect} selectedId={selectedId} />)}</div>;
      case 'card':
        return <div style={{ ...style, borderRadius: style.borderRadius || '12px', overflow: 'hidden' }}>
          {children?.map(c => <RenderComponent key={c.id} component={c} onSelect={onSelect} selectedId={selectedId} />)}
        </div>;
      default:
        return null;
    }
  })();

  return (
    <div
      data-component-id={component.id}
      onClick={(e) => { e.stopPropagation(); onSelect?.(component.id) }}
      style={{
        outline: selectedId === component.id ? '2px solid #6b8c6e' : 'none',
        cursor: onSelect ? 'pointer' : 'default',
      }}
    >
      {inner}
    </div>
  );
}

export function PageRenderer({ data, onSelect, selectedId }: {
  data: { components: PageComponent[] }
  onSelect?: (id: string) => void
  selectedId?: string
}) {
  return (
    <>
      {data.components.map(c => (
        <RenderComponent key={c.id} component={c} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </>
  );
}
