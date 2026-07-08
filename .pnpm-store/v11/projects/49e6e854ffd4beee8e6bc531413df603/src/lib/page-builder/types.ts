export type ComponentType = 'heading' | 'text' | 'button' | 'image' | 'box' | 'card';

export interface PageComponent {
  id: string;
  type: ComponentType;
  props: {
    text?: string;
    color?: string;
    bgColor?: string;
    fontSize?: number;
    width?: string;
    height?: string;
    padding?: [number, number, number, number];
    margin?: [number, number, number, number];
    src?: string;
    href?: string;
    borderRadius?: string;
  };
  children?: PageComponent[];
}

export interface PageData {
  version: 1;
  components: PageComponent[];
}
