"use strict";
(() => {
  // src/constants.ts
  var COLUMNS = 13;
  var EXTRA_FIELD_ROWS = 4;
  var FIELD_WIDTH = 0.75;
  var WIDTH = 400;
  var HEIGHT = 600;
  var DEG60 = Math.PI / 3;
  var SQRT3 = Math.sqrt(3);
  var HEIGHT_COEFF = 0.5 * SQRT3;
  var START_SPEED = 400;
  var SPEED_MULT = 0.99;
  var SCORE_TABLE = [100, 200, 400, 800];
  var NEIGHBORS = [
    // Even column (q & 1 == 0)
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
      [-1, 1],
      [0, 2],
      [1, 2],
      [2, 1],
      [2, 0],
      [2, -1],
      [1, -1],
      [0, -2],
      [-1, -1],
      [-2, -1],
      [-2, 0],
      [-2, 1],
      [-1, 2]
    ],
    // Odd column (q & 1 == 1)
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, -1],
      [-1, 0],
      [0, 2],
      [1, 1],
      [2, 1],
      [2, 0],
      [2, -1],
      [1, -2],
      [0, -2],
      [-1, -2],
      [-2, -1],
      [-2, 0],
      [-2, 1],
      [-1, 1]
    ]
  ];
  var SHAPES = [
    [[0, 1, 3, 5], [0, 2, 4, 6]],
    [[0, 1, 4, 13], [0, 2, 5, 15], [0, 3, 6, 17], [0, 4, 1, 7], [0, 5, 2, 9], [0, 6, 3, 11]],
    [[0, 3, 4, 5], [0, 4, 5, 6], [0, 5, 6, 1], [0, 6, 1, 2], [0, 1, 2, 3], [0, 2, 3, 4]],
    [[1, 4, 5, 6], [2, 5, 6, 1], [3, 6, 1, 2], [4, 1, 2, 3], [5, 2, 3, 4], [6, 3, 4, 5]],
    [[0, 1, 4, 12], [0, 2, 5, 14], [0, 3, 6, 16], [0, 4, 1, 18], [0, 5, 2, 8], [0, 6, 3, 10]],
    [[0, 1, 4, 14], [0, 2, 5, 16], [0, 3, 6, 18], [0, 4, 1, 8], [0, 5, 2, 10], [0, 6, 3, 12]],
    [[0, 1, 3, 12], [0, 2, 4, 14], [0, 3, 5, 16], [0, 4, 6, 18], [0, 5, 1, 8], [0, 6, 2, 10]],
    [[0, 1, 5, 14], [0, 2, 6, 16], [0, 3, 1, 18], [0, 4, 2, 8], [0, 5, 3, 10], [0, 6, 4, 12]],
    [[0, 1, 3, 4], [0, 2, 4, 5], [0, 3, 5, 6], [0, 4, 6, 1], [0, 5, 1, 2], [0, 6, 2, 3]],
    [[0, 1, 5, 4], [0, 2, 6, 5], [0, 3, 1, 6], [0, 4, 2, 1], [0, 5, 3, 2], [0, 6, 4, 3]]
  ];
  var PIECE_COLORS = [
    [1, 0.5, 0],
    // Orange
    [0, 0, 1],
    // Blue
    [0.63, 0.12, 0.94],
    // Purple
    [0, 1, 0],
    // Green
    [1, 0, 1],
    // Magenta
    [0, 1, 1],
    // Cyan
    [1, 1, 0],
    // Yellow
    [1, 0, 0],
    // Red
    [0.68, 0.85, 0.9],
    // Light Blue
    [0.18, 0.18, 0.18]
    // Grey
  ];
  var BG_COLOR = [0, 0, 0];
  var HEX_GRID_COLOR = [0.1, 0.1, 0.1];
  var AREA_FRAME_COLOR = [0.18, 0.18, 0.18];
  var WHITE = [1, 1, 1];

  // src/renderer.ts
  var VERT_SRC = `#version 300 es
in vec2 a_position;
in vec3 a_color;
uniform mat4 u_projection;
out vec3 v_color;
void main() {
  v_color = a_color;
  gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
}`;
  var FRAG_SRC = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 fragColor;
void main() {
  fragColor = vec4(v_color, 1.0);
}`;
  var Renderer = class {
    constructor(canvas2) {
      this.canvas = canvas2;
      this.gridCount = 0;
      this.frameCount = 0;
      this.fieldTriCount = 0;
      this.pieceTriCount = 0;
      this.pieceLineCount = 0;
      const gl = canvas2.getContext("webgl2", { antialias: true, alpha: false });
      if (!gl) throw new Error("WebGL2 not supported");
      this.gl = gl;
      this.program = this.createProgram(VERT_SRC, FRAG_SRC);
      this.posLoc = gl.getAttribLocation(this.program, "a_position");
      this.colLoc = gl.getAttribLocation(this.program, "a_color");
      this.projLoc = gl.getUniformLocation(this.program, "u_projection");
      this.hexRadius = 2 * (FIELD_WIDTH / (3 * COLUMNS + 1));
      const hexHeight = SQRT3 * this.hexRadius;
      this.fieldHeight = HEIGHT / WIDTH;
      this.hexNumVert = Math.floor(this.fieldHeight / hexHeight);
      this.hexVertices = [];
      for (let i = 0; i < 6; i++) {
        const angle = i * DEG60;
        this.hexVertices.push([
          this.hexRadius * Math.cos(angle),
          this.hexRadius * Math.sin(angle)
        ]);
      }
      this.gridVAO = gl.createVertexArray();
      this.frameVAO = gl.createVertexArray();
      this.fieldVAO = gl.createVertexArray();
      this.fieldVBO = gl.createBuffer();
      this.pieceTriVAO = gl.createVertexArray();
      this.pieceTriVBO = gl.createBuffer();
      this.pieceLineVAO = gl.createVertexArray();
      this.pieceLineVBO = gl.createBuffer();
      this.buildGrid();
      this.buildFrame();
      gl.clearColor(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], 1);
      gl.useProgram(this.program);
    }
    get numVerticalHexes() {
      return this.hexNumVert;
    }
    // Hex grid coords → GL coords (matches C++ hex2gl)
    hex2gl(q, r) {
      return [
        this.hexRadius * 1.5 * q + this.hexRadius,
        this.hexRadius * SQRT3 * (r - 0.5 * (q & 1))
      ];
    }
    hexVerts(cx, cy) {
      return this.hexVertices.map(([vx, vy]) => [vx + cx, vy + cy]);
    }
    // 4 triangles from hex fan
    pushHexTris(data, cx, cy, r, g, b, ox = 0, oy = 0) {
      const v = this.hexVerts(cx, cy);
      for (let i = 0; i < 4; i++) {
        data.push(v[0][0] + ox, v[0][1] + oy, r, g, b);
        data.push(v[i + 1][0] + ox, v[i + 1][1] + oy, r, g, b);
        data.push(v[i + 2][0] + ox, v[i + 2][1] + oy, r, g, b);
      }
    }
    // 6 line segments for hex outline
    pushHexLines(data, cx, cy, r, g, b, ox = 0, oy = 0) {
      const v = this.hexVerts(cx, cy);
      for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        data.push(v[i][0] + ox, v[i][1] + oy, r, g, b);
        data.push(v[j][0] + ox, v[j][1] + oy, r, g, b);
      }
    }
    createProgram(vSrc, fSrc) {
      const gl = this.gl;
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vSrc);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS))
        throw new Error("Vertex shader: " + gl.getShaderInfoLog(vs));
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fSrc);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
        throw new Error("Fragment shader: " + gl.getShaderInfoLog(fs));
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw new Error("Program link: " + gl.getProgramInfoLog(prog));
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return prog;
    }
    setupVAO(vao, vbo, data) {
      const gl = this.gl;
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      const stride = 20;
      gl.enableVertexAttribArray(this.posLoc);
      gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(this.colLoc);
      gl.vertexAttribPointer(this.colLoc, 3, gl.FLOAT, false, stride, 8);
      gl.bindVertexArray(null);
    }
    buildGrid() {
      const data = [];
      const [r, g, b] = HEX_GRID_COLOR;
      for (let i = 0; i < COLUMNS; i++) {
        for (let j = 0; j < this.hexNumVert + EXTRA_FIELD_ROWS; j++) {
          const [cx, cy] = this.hex2gl(i, j);
          this.pushHexLines(data, cx, cy, r, g, b);
        }
      }
      this.gridCount = data.length / 5;
      const vbo = this.gl.createBuffer();
      this.setupVAO(this.gridVAO, vbo, new Float32Array(data));
    }
    buildFrame() {
      const [r, g, b] = AREA_FRAME_COLOR;
      const h = this.fieldHeight;
      const data = [
        0,
        0,
        r,
        g,
        b,
        1,
        0,
        r,
        g,
        b,
        1,
        0,
        r,
        g,
        b,
        1,
        h,
        r,
        g,
        b,
        1,
        h,
        r,
        g,
        b,
        0,
        h,
        r,
        g,
        b,
        0,
        h,
        r,
        g,
        b,
        0,
        0,
        r,
        g,
        b,
        FIELD_WIDTH,
        0,
        r,
        g,
        b,
        FIELD_WIDTH,
        h,
        r,
        g,
        b
      ];
      this.frameCount = data.length / 5;
      const vbo = this.gl.createBuffer();
      this.setupVAO(this.frameVAO, vbo, new Float32Array(data));
    }
    updateField(hexMap, colorMap) {
      const data = [];
      for (let i = 0; i < COLUMNS; i++) {
        for (let j = 0; j < this.hexNumVert + EXTRA_FIELD_ROWS; j++) {
          if (hexMap[i][j] === 0) continue;
          const [cx, cy] = this.hex2gl(i, j);
          const c = colorMap[i][j];
          this.pushHexTris(data, cx, cy, c[0], c[1], c[2]);
        }
      }
      this.fieldTriCount = data.length / 5;
      this.setupVAO(this.fieldVAO, this.fieldVBO, new Float32Array(data));
    }
    updatePieces(piece, previewPiece, previewOffset) {
      const tris = [];
      const lines = [];
      const addPieceGeometry = (p, ox = 0, oy = 0) => {
        const [r, g, b] = p.color;
        for (let k = 0; k < 4; k++) {
          const [q, row] = p.hexagons[k];
          const [cx, cy] = this.hex2gl(q, row);
          this.pushHexTris(tris, cx, cy, r, g, b, ox, oy);
          this.pushHexLines(lines, cx, cy, WHITE[0], WHITE[1], WHITE[2], ox, oy);
        }
      };
      if (piece) addPieceGeometry(piece);
      if (previewPiece) addPieceGeometry(previewPiece, previewOffset[0], previewOffset[1]);
      this.pieceTriCount = tris.length / 5;
      this.setupVAO(this.pieceTriVAO, this.pieceTriVBO, new Float32Array(tris));
      this.pieceLineCount = lines.length / 5;
      this.setupVAO(this.pieceLineVAO, this.pieceLineVBO, new Float32Array(lines));
    }
    resize(width, height) {
      const gl = this.gl;
      const targetRatio = this.fieldHeight;
      let glW = width;
      let glH = height;
      const ratio = height / width;
      if (ratio > targetRatio) glH = glW * targetRatio;
      else if (ratio < targetRatio) glW = glH / targetRatio;
      this.canvas.width = glW;
      this.canvas.height = glH;
      gl.viewport(0, 0, glW, glH);
      const h = this.fieldHeight;
      const proj = new Float32Array([
        2,
        0,
        0,
        0,
        0,
        2 / h,
        0,
        0,
        0,
        0,
        -1,
        0,
        -1,
        -1,
        0,
        1
      ]);
      gl.useProgram(this.program);
      gl.uniformMatrix4fv(this.projLoc, false, proj);
    }
    render() {
      const gl = this.gl;
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (this.fieldTriCount > 0) {
        gl.bindVertexArray(this.fieldVAO);
        gl.drawArrays(gl.TRIANGLES, 0, this.fieldTriCount);
      }
      gl.bindVertexArray(this.gridVAO);
      gl.drawArrays(gl.LINES, 0, this.gridCount);
      if (this.pieceTriCount > 0) {
        gl.bindVertexArray(this.pieceTriVAO);
        gl.drawArrays(gl.TRIANGLES, 0, this.pieceTriCount);
      }
      if (this.pieceLineCount > 0) {
        gl.bindVertexArray(this.pieceLineVAO);
        gl.drawArrays(gl.LINES, 0, this.pieceLineCount);
      }
      gl.bindVertexArray(this.frameVAO);
      gl.drawArrays(gl.LINES, 0, this.frameCount);
      gl.bindVertexArray(null);
    }
  };

  // src/piece.ts
  var Piece = class {
    constructor(typeId, pos, color, rotId = 0) {
      this.typeId = typeId;
      this.pos = [pos[0], pos[1]];
      this.color = color;
      this.rotId = rotId;
      this.hexagons = this.buildHexagons(this.pos, rotId);
    }
    buildHexagons(pos, rotId) {
      const parity = pos[0] & 1;
      const shape = SHAPES[this.typeId][rotId];
      const hexagons = [];
      for (let i = 0; i < 4; i++) {
        const neighborIdx = shape[i];
        const offset = NEIGHBORS[parity][neighborIdx];
        hexagons.push([offset[0] + pos[0], offset[1] + pos[1]]);
      }
      return hexagons;
    }
    collision(hexagons, hexMap) {
      for (let i = 0; i < 4; i++) {
        if (hexagons[i][0] < 0) return 1 /* LEFT_BORDER */;
        if (hexagons[i][0] > hexMap.length - 1) return 2 /* RIGHT_BORDER */;
      }
      for (let k = 0; k < 4; k++) {
        const col = hexagons[k][0];
        const row = hexagons[k][1];
        if (hexMap[col][row] > 0) return 3 /* PIECE_HEAP */;
      }
      return 0 /* NO_COLLISION */;
    }
    rotate(direction, hexMap) {
      const shapesCount = SHAPES[this.typeId].length;
      const rid = this.rotId + direction;
      const newRotId = rid < 0 ? shapesCount - 1 : rid % shapesCount;
      const hexagons = this.buildHexagons(this.pos, newRotId);
      if (this.collision(hexagons, hexMap) !== 0 /* NO_COLLISION */) return false;
      this.rotId = newRotId;
      this.hexagons = hexagons;
      return true;
    }
    move(leftRight, hexMap, vert = 0) {
      const newPos = [this.pos[0] + leftRight, this.pos[1] + vert];
      const hexagons = this.buildHexagons(newPos, this.rotId);
      const result = this.collision(hexagons, hexMap);
      if (result !== 0 /* NO_COLLISION */) return result;
      this.pos = newPos;
      this.hexagons = hexagons;
      return 0 /* NO_COLLISION */;
    }
    moveLeft(hexMap) {
      return this.move(-1, hexMap);
    }
    moveDownLeft(hexMap) {
      return this.move(-1, hexMap, -1);
    }
    moveRight(hexMap) {
      return this.move(1, hexMap);
    }
    moveDownRight(hexMap) {
      return this.move(1, hexMap, -1);
    }
    rotateLeft(hexMap) {
      return this.rotate(-1, hexMap);
    }
    rotateRight(hexMap) {
      return this.rotate(1, hexMap);
    }
    fall(hexMap) {
      const newPos = [this.pos[0], this.pos[1] - 1];
      const hexagons = this.buildHexagons(newPos, this.rotId);
      if (this.collision(hexagons, hexMap) !== 0 /* NO_COLLISION */) return false;
      this.pos = newPos;
      this.hexagons = hexagons;
      return true;
    }
  };

  // src/game.ts
  var Game = class {
    // field needs re-upload
    constructor(renderer2, onStatus) {
      this.hexMap = [];
      this.colorMap = [];
      this.piece = null;
      this.previewPiece = null;
      this.score = 0;
      this.lineCount = 0;
      this.speed = START_SPEED;
      this.paused = false;
      this.gameOver = false;
      this.tickTimer = 0;
      this.gameStartTime = 0;
      this.dirty = true;
      this.renderer = renderer2;
      this.onStatus = onStatus;
      this.hexNumVert = renderer2.numVerticalHexes;
      this.totalRows = this.hexNumVert + EXTRA_FIELD_ROWS;
      this.topCenter = [Math.floor(COLUMNS / 2), this.hexNumVert];
      const previewWidth = 1 - FIELD_WIDTH;
      this.previewOffset = [0.5 * (FIELD_WIDTH + previewWidth), -0.25 * (600 / 400)];
      this.initMaps();
      this.renderer.updateField(this.hexMap, this.colorMap);
    }
    initMaps() {
      this.hexMap = [];
      this.colorMap = [];
      for (let i = 0; i < COLUMNS; i++) {
        this.hexMap.push(new Array(this.totalRows).fill(0));
        const col = [];
        for (let j = 0; j < this.totalRows; j++) col.push([...BG_COLOR]);
        this.colorMap.push(col);
      }
      for (let i = 0; i < COLUMNS; i++) {
        this.hexMap[i][0] = 1;
        this.colorMap[i][0] = [...HEX_GRID_COLOR];
      }
    }
    selectPiece() {
      return Math.floor(Math.random() * 10);
    }
    get running() {
      return this.tickTimer !== 0 && !this.paused && !this.gameOver;
    }
    newGame() {
      this.speed = START_SPEED;
      this.score = 0;
      this.lineCount = 0;
      this.gameOver = false;
      this.paused = false;
      for (let i = 0; i < COLUMNS; i++) {
        for (let j = 1; j < this.totalRows; j++) {
          this.hexMap[i][j] = 0;
          this.colorMap[i][j] = [...BG_COLOR];
        }
      }
      const t1 = this.selectPiece();
      this.piece = new Piece(t1, [this.topCenter[0], this.topCenter[1]], PIECE_COLORS[t1]);
      const t2 = this.selectPiece();
      this.previewPiece = new Piece(t2, [this.topCenter[0], this.topCenter[1]], PIECE_COLORS[t2]);
      this.dirty = true;
      this.renderer.updateField(this.hexMap, this.colorMap);
      this.gameStartTime = performance.now();
      this.onStatus(this.statusLine());
      this.startTick();
    }
    pauseGame() {
      if (this.gameOver) return;
      if (!this.paused && this.tickTimer) {
        clearTimeout(this.tickTimer);
        this.tickTimer = 0;
        this.paused = true;
        this.onStatus("Paused");
      } else if (this.paused && this.piece) {
        this.paused = false;
        this.startTick();
        this.onStatus(this.statusLine());
      }
    }
    startTick() {
      if (this.tickTimer) clearTimeout(this.tickTimer);
      this.tickTimer = window.setTimeout(() => this.tick(), this.speed);
    }
    tick() {
      if (!this.piece || this.paused || this.gameOver) return;
      if (this.piece.fall(this.hexMap)) {
        this.startTick();
        return;
      }
      let isGameOver = false;
      for (let k = 0; k < 4; k++) {
        const [i, j2] = this.piece.hexagons[k];
        this.hexMap[i][j2] = 1;
        this.colorMap[i][j2] = [...this.piece.color];
        if (j2 >= this.hexNumVert - 1) isGameOver = true;
      }
      if (isGameOver) {
        this.gameOver = true;
        clearTimeout(this.tickTimer);
        this.tickTimer = 0;
        this.dirty = true;
        this.renderer.updateField(this.hexMap, this.colorMap);
        this.onStatus(this.gameOverMsg());
        return;
      }
      let j = 1;
      let rmLines = 0;
      while (j < this.hexNumVert) {
        let rowSum = 0;
        for (let i = 0; i < COLUMNS; i++) rowSum += this.hexMap[i][j];
        if (rowSum !== COLUMNS) {
          j++;
          continue;
        }
        for (let k = j; k < this.hexNumVert - 1; k++) {
          for (let l = 0; l < COLUMNS; l++) {
            this.hexMap[l][k] = this.hexMap[l][k + 1];
            this.colorMap[l][k] = [...this.colorMap[l][k + 1]];
          }
        }
        rmLines++;
      }
      this.dirty = true;
      this.renderer.updateField(this.hexMap, this.colorMap);
      this.piece = this.previewPiece;
      const t = this.selectPiece();
      this.previewPiece = new Piece(t, [this.topCenter[0], this.topCenter[1]], PIECE_COLORS[t]);
      this.startTick();
      if (rmLines > 0) {
        this.lineCount += rmLines;
        const idx = Math.min(rmLines, SCORE_TABLE.length) - 1;
        this.score += SCORE_TABLE[idx] * rmLines;
        this.speed = Math.pow(SPEED_MULT, rmLines) * this.speed;
        this.onStatus(this.statusLine());
      }
    }
    // Input handlers
    handleLeft() {
      if (!this.piece || !this.running) return;
      const result = this.piece.moveLeft(this.hexMap);
      if (result === 3 /* PIECE_HEAP */) {
        this.piece.moveDownLeft(this.hexMap);
      }
    }
    handleRight() {
      if (!this.piece || !this.running) return;
      const result = this.piece.moveRight(this.hexMap);
      if (result === 3 /* PIECE_HEAP */) {
        this.piece.moveDownRight(this.hexMap);
      }
    }
    handleRotateLeft() {
      if (!this.piece || !this.running) return;
      this.piece.rotateLeft(this.hexMap);
    }
    handleRotateRight() {
      if (!this.piece || !this.running) return;
      this.piece.rotateRight(this.hexMap);
    }
    handleDrop() {
      if (!this.piece || !this.running) return;
      while (this.piece.fall(this.hexMap)) {
      }
    }
    // Render current frame
    renderFrame() {
      this.renderer.updatePieces(this.piece, this.previewPiece, this.previewOffset);
      this.renderer.render();
    }
    statusLine() {
      return `Score: ${this.score} | Speed: ${this.speed.toFixed(1)} ms | Lines: ${this.lineCount}`;
    }
    gameOverMsg() {
      const elapsed = Math.floor((performance.now() - this.gameStartTime) / 1e3);
      const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const sec = String(elapsed % 60).padStart(2, "0");
      return `Game Over | Score: ${this.score} | Lines: ${this.lineCount} | Time: ${min}:${sec} s`;
    }
  };

  // src/input.ts
  function setupInput(game2) {
    document.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          game2.handleLeft();
          break;
        case "ArrowRight":
          e.preventDefault();
          game2.handleRight();
          break;
        case "ArrowDown":
          e.preventDefault();
          game2.handleRotateLeft();
          break;
        case "ArrowUp":
          e.preventDefault();
          game2.handleRotateRight();
          break;
        case " ":
          e.preventDefault();
          game2.handleDrop();
          break;
        case "n":
        case "N":
          game2.newGame();
          break;
        case "p":
        case "P":
          game2.pauseGame();
          break;
      }
    });
  }

  // src/main.ts
  var canvas = document.getElementById("game");
  var status = document.getElementById("status");
  var renderer = new Renderer(canvas);
  var game = new Game(renderer, (msg) => {
    status.textContent = msg;
  });
  setupInput(game);
  function onResize() {
    renderer.resize(window.innerWidth, window.innerHeight - 30);
  }
  window.addEventListener("resize", onResize);
  onResize();
  function frame() {
    game.renderFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
//# sourceMappingURL=vextris.js.map
