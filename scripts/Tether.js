class Tether {
  constructor(nodes, texture, options = {}) {
    this.nodes = nodes;
    this.texture = new PIXI.Texture.from(texture);
    this.stretchmark = options.stretchmark || false;
    this.breakpoint = options.breakpoint || false;
    this.length = options.length || Infinity;
    this.width = options.width || 5;
  }
  static Create(nodes, texture, options = {}) {
    let explandedNodes = [];
    for (let node of nodes) {
      explandedNodes.push(Tether.processNode(node));
    }
    return new Tether(explandedNodes, texture, options);
  }
  static processNode(node) {
    let anchor = node.anchor || Tether.autoDetermineAnchor(node);
    return new TetherNode(
      anchor,
      node.element,
      node.element.document.documentName
    );
  }

  static autoDetermineAnchor(node) {
    return node.center;
  }
  addNode(node) {
    this.nodes.push(Tether.processNode(node));
  }
  removeNodeById(id) {
    for (let node of this.nodes) {
      if (node.element.id === id) {
        this.nodes.splice(this.nodes.indexOf(node), 1);
        return true;
      }
    }
    return false;
  }
  _draw() {
    let tether = new PIXI.Graphics();
    tether.beginFill(0xffffff, 1);
    for (let i = 0; i < this.nodes.length - 1; i++) {
      let current = this.nodes[i];
      let next = this.nodes[i + 1];
      const polygon = Tether.getPolygon(
        current.getAnchorPoint,
        next.getAnchorPoint,
        this.width
      );
      tether.drawPolygon(polygon);
    }
  }

  static unitToPx() {
    return canvas.dimensions.size / canvas.dimensions.distance;
  }

  static getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  static getPolygon(o, c1, w) {
    const wp = (w * Tether.unitToPx()) / 2;
    const d = Tether.getDistance(o, c1) * Tether.unitToPx();
    const points = [
      { x: o.x + (wp * (o.y - c1.y)) / d, y: o.y - (wp * (o.x - c1.x)) / d },
      { x: o.x - (wp * (o.y - c1.y)) / d, y: o.y + (wp * (o.x - c1.x)) / d },
      { x: c1.x - (wp * (o.y - c1.y)) / d, y: c1.y + (wp * (o.x - c1.x)) / d },
      { x: c1.x + (wp * (o.y - c1.y)) / d, y: c1.y - (wp * (o.x - c1.x)) / d },
    ];
    return new PIXI.Polygon(points);
  }
}

class TetherNode {
  constructor(anchor, element, documentName) {
    this.element = element;
    this.anchor = anchor;
    this.documentName = documentName;
  }

  get getAnchorPoint() {
    switch (this.anchor) {
      case "center":
        return this.element.center;
        break;
    }
  }
}
