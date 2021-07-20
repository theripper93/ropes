class Tether {
  constructor(nodes, texture, options = {}, id) {
    this.nodes = nodes;
    this.texture = texture ? new PIXI.Texture.from(texture) : undefined;
    this.texturePath = texture;
    this.stretchmark = options.stretchmark || false;
    this.break = options.break || false;
    this.maxLength = options.length || Infinity;
    this.width = options.width || 5;
    this.graphics = new PIXI.Graphics();
    this.hookId;
    this.id = id || randomID(20);
    canvas.background.addChild(this.graphics);
  }

  addNode(node) {
    this.nodes.push(Tether.processNode(node));
    this.updateFlags();
  }

  removeNodeById(id) {
    for (let node of this.nodes) {
      if (node.element.id === id) {
        this.nodes.splice(this.nodes.indexOf(node), 1);
        this.updateFlags();
        return true;
      }
    }
    return false;
  }

  _refresh() {
    let tether = this.graphics;
    tether.clear();
    for (let i = 0; i < this.nodes.length - 1; i++) {
      let current = this.nodes[i];
      let next = this.nodes[i + 1];
      const polygon = Tether.getPolygon(
        current.getAnchorPoint,
        next.getAnchorPoint,
        this.width
      );
      if (this.texture) {
        let rotationMatrix = new PIXI.Matrix();
        rotationMatrix.rotate(
          Tether.getAngleRad(current.getAnchorPoint, next.getAnchorPoint) +
            Math.PI / 2
        );
        tether.beginTextureFill({
          texture: this.texture,
          matrix: rotationMatrix,
        });
      } else {
        tether.beginFill(0xffffff, 1);
      }
      tether.drawPolygon(polygon).endFill();
      let currentLen;
      if (this.stretchmark || this.break) {
        currentLen = this.length;
      }
      if (this.break && currentLen > this.maxLength) {
        this.destroy();
        return;
      }
      if (this.stretchmark) {
        let percentAlpha = currentLen / this.maxLength;
        tether.beginFill(0xff0000, percentAlpha - 0.5);
        tether.drawPolygon(polygon);
        tether.endFill();
      }
    }
  }

  render(render = true) {
    if (render) {
      this.hookId = Hooks.on("onMovementFrame", (tokenId) => {
        for (let id of this.nodeIds) {
          if (tokenId === id) {
            this._refresh();
            return;
          }
        }
      });
      this._refresh();
    } else {
      Hooks.off("onMovementFrame", this.hookId);
      this.graphics.destroy();
    }
  }

  destroy() {
    this.render(false);
    Tether.removeFromFlags(this.id);
  }

  get length() {
    let length = 0;
    for (let i = 0; i < this.nodes.length - 1; i++) {
      let current = this.nodes[i];
      let next = this.nodes[i + 1];
      length += Tether.getDistance(current.getAnchorPoint, next.getAnchorPoint);
    }
    return length / Tether.unitToPx();
  }
  get nodeIds() {
    return this.nodes.map((node) => node.element.id);
  }
  static Create(nodes, texture, options = {}) {
    let explandedNodes = [];
    for (let node of nodes) {
      explandedNodes.push(Tether.processNode(node));
    }
    let tether = new Tether(explandedNodes, texture, options);
    Tether.addToFlags(tether);
    Tether.addToCanvas(tether);
    return tether;
  }
  static DestroyByEntity(entity) {
    for(let tether of canvas.tethers){
      if(tether.nodes.some(node => node.element === entity)){
        tether.destroy();
        return
      }
    } 
  }
  static CreateFromFlag(flag) {
    let explandedNodes = [];
    for (let node of flag.nodes) {
      node.element = canvas.getLayerByEmbeddedName(node.documentName).get(node.id);
      explandedNodes.push(Tether.processNode(node));
    }
    let tether = new Tether(
      explandedNodes,
      flag.texture,
      flag.options,
      flag.id
    );
    Tether.addToCanvas(tether);
    return tether;
  }
  static unitToPx() {
    return canvas.dimensions.size / canvas.dimensions.distance;
  }
  static getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }
  static getAngleRad(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
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
  static processNode(node) {
    let anchor = node.anchor || Tether.autoDetermineAnchor(node);
    return new TetherNode(
      anchor,
      node.element,
      node.element.document.documentName,
      node.element.id
    );
  }
  static autoDetermineAnchor(node) {
    return "center";
  }
  static addToFlags(tether) {
    if (!game.user.isGM) return;
    let oldFlag = canvas.scene.getFlag("ropes", "tethers") || [];
    oldFlag.push(Tether.tetherToFlag(tether));
    canvas.scene.setFlag("ropes", "tethers", oldFlag);
  }
  static removeFromFlags(tetherId) {
    if (!game.user.isGM) return;
    let oldFlag = canvas.scene.getFlag("ropes", "tethers") || [];
    let newFlag = [];
    for (let tether of oldFlag) {
      if (tether.id !== tetherId) {
        newFlag.push(tether);
      }
    }
    canvas.scene.setFlag("ropes", "tethers", newFlag);
  }
  updateFlags() {
    if (!game.user.isGM) return;
    let oldFlag = canvas.scene.getFlag("ropes", "tethers") || [];
    let newFlag = [];
    for (let tether of oldFlag) {
      if (tether.id === this.id) {
        newFlag.push(Tether.tetherToFlag(this));
      } else {
        newFlag.push(tether);
      }
    }
    canvas.scene.setFlag("ropes", "tethers", newFlag);
  }
  static tetherToFlag(tether) {
    let simpleNodes = [];
    for (let node of tether.nodes) {
      simpleNodes.push({
        id: node.element.id,
        anchor: node.anchor,
        documentName: node.documentName,
      });
    }
    return {
      id: tether.id,
      nodes: simpleNodes,
      texture: tether.texturePath,
      options: {
        length: tether.maxLength,
        break: tether.break,
        stretchmark: tether.stretchmark,
        width: tether.width,
      },
    };
  }
  static addToCanvas(tether) {
    if (!canvas.tethers) {
      canvas.tethers = [];
    }
    canvas.tethers.push(tether);
  }
  static clearAll() {
    if (canvas.tethers) {
      for (let tether of canvas.tethers) {
        tether.render(false);
      }
    }
    canvas.tethers = [];
  }
}

class TetherNode {
  constructor(anchor, element, documentName, id) {
    this.element = element;
    this.anchor = anchor;
    this.documentName = documentName;
    this.id = id;
  }

  get getAnchorPoint() {
    switch (this.anchor) {
      case "center":
        return this.element.center;
        break;
    }
  }
}

class Rope {
  constructor(options, texture = "modules/ropes/textures/rope.webp") {
    this.options = options;
    this.nodes = [];
    this.texture = texture;
  }
  static Start(options = { width: 5, stretchmark: true, length: 100, break: true }) {
    canvas.currentRope = new Rope(options);
  }
  static Add(element) {
    canvas.currentRope.nodes.push({
      element: element || canvas.activeLayer.controlled[0],
    });
  }
  static Create() {
    debugger
    Tether.Create(
      canvas.currentRope.nodes,
      canvas.currentRope.texture,
      canvas.currentRope.options
    );
    Rope.Clear();
  }
  static Clear() {
    canvas.currentRope = null;
  }
}
