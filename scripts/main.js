Hooks.once("init", async function () {});

Hooks.once("ready", async function () {
  libWrapper.register("ropes", "Token.prototype._onMovementFrame", (wraped,...args) => {
    wraped(...args)
    Hooks.callAll("onMovementFrame",args[1][0].parent.id);
    
  });
});

Hooks.on("canvasReady", () => {
  let tetherFlag = canvas.scene.getFlag("ropes", "tethers") || [];
  for (let tether of tetherFlag) {
    let rope = Tether.CreateFromFlag(tether);
    rope.render(true);
  }
});

Hooks.on("updateScene", (scene, updates) => {
  if (!updates.flags.ropes) return;
  let tetherFlag = canvas.scene.getFlag("ropes", "tethers") || [];
  Tether.clearAll();
  for (let tether of tetherFlag) {
    let rope = Tether.CreateFromFlag(tether);
    rope.render(true);
  }
});
