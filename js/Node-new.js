export class Node {
  constructor(data, element) {
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.svg = data.svg;
    this.label = data.label;
    this.class = data.class;
    this.scale = data.scale ?? 1;
    this.element = element;
  }

  getTransformedCenter() {
    try {
      const bbox = this.element.getBBox();
      const ctm = this.element.getCTM();
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const transformedX = ctm.a * cx + ctm.c * cy + ctm.e;
      const transformedY = ctm.b * cx + ctm.d * cy + ctm.f;
      return {
        x: transformedX,
        y: transformedY,
        radius: Math.min(bbox.width, bbox.height) * (this.scale ?? 1) / 2
      };
    } catch (error) {
      console.error('Error in getTransformedCenter:', error);
      // Fallback to basic positioning
      return {
        x: this.x + 25,
        y: this.y + 25,
        radius: 25
      };
    }
  }
}
