//Extended command for customization
const options = {
    width: 5, //How thick the rope is
    stretchmark: true, //Rope will be tinted red as it approaches it's max length
    length: 100, //Maximum length of rope in grid units
    break: true //The rope breaks when it reaches it's max length
};
const texture = "modules/ropes/textures/rope.webp"; //Rope texture
Rope.Start(options, texture);
