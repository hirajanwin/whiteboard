// this initializes all notepads on the page
document.addEventListener("DOMContentLoaded", () => {

  const $targets = Array.from(document.querySelectorAll("canvas[data-notepad]"));
  $targets.map($target => {
    // try to parse image data, if it's supplied
    let imageData = {strokes: []};
    try {
      imageData = JSON.parse($target.dataset.notepad-image);
    } catch (e) {}

    // create the notepad instance and bind it to the element
    notepad = new Notepad($target, imageData);
    $target.notepad = notepad;

    // look for notepad controls and bind them
    const notepadName = $target.dataset.notepad;
    let $toolTargets = Array.from(document.querySelectorAll(`input[data-for-notepad=${notepadName}]`));
    $toolTargets.map($tool => {
      if ($tool.type !== "radio" || $tool.checked) {
        notepad.setOption($tool.name, $tool.value);
      }
      $tool.addEventListener("change", event => {
        notepad.setOption(event.target.name, event.target.value);
      });
    });
  });

});

class StrokeHistory {
  /* This keeps a history of all strokes so far, to support undo/redo. A stroke
   * is a list of { x, y, force } objects which are connected. `numStrokes`
   * marks how many strokes should be visible; if it's less than the length of
   * the `strokes` array, that means there are some strokes that can be
   * "redone". When a new stroke is added, all potential "redo" strokes are
   * discarded.
   */

  constructor(strokes) {
    this.strokes = strokes;
    this.numStrokes = strokes.length;

    this.addStroke = this.addStroke.bind(this);
    this.undo = this.undo.bind(this);
    this.redo = this.redo.bind(this);
    this.currentStrokes = this.currentStrokes.bind(this);
    this.clear = this.clear.bind(this);
  }

  addStroke(stroke) {
    // erase redo strokes
    this.strokes = this.currentStrokes();
    this.strokes.push(stroke);
    this.numStrokes = this.strokes.length;
  }

  undo() {
    if (this.numStrokes > 0) {
      this.numStrokes--;
    }
  }

  redo() {
    if (this.numStrokes < this.strokes.length) {
      this.numStrokes++;
    }
  }

  currentStrokes() {
    // returns all the strokes that should be visible
    return this.strokes.slice(0, this.numStrokes);
  }

  clear() {
    this.strokes = [];
    this.numStrokes = 0;
  }

}

class MouseInput {
  constructor(target, keyboardInput, cursor) {
    this.keyboard = keyboardInput;
    this.cursor = cursor;
    this.action = null;
    this.movePosition = { x: 0, y: 0 };

    // this.onmousedown = this.onmousedown.bind(this);
    // this.onmouseup = this.onmouseup.bind(this);
    // this.onmousemove = this.onmousemove.bind(this);

    target.addEventListener("mousedown", this.onmousedown(this));
    target.addEventListener("mouseup", this.onmouseup(this));
    target.addEventListener("mousemove", this.onmousemove(this));
    target.addEventListener("mouseout", this.onmouseout);
    target.addEventListener("wheel", this.onwheel);
  }

  onmousedown(that) {
    return event => {
      event.preventDefault();
      if (that.keyboard.modifiers.shift) {
        // move
        that.action = 'move';
        that.movePosition = {
          x: window.devicePixelRatio*event.clientX,
          y: window.devicePixelRatio*event.clientY
        };
        that.cursor.setCursor("grabbing");
      } else {
        // draw
        that.action = 'draw';
        const rect = event.target.getBoundingClientRect(); // canvas rectangle
        event.target.dispatchEvent(new CustomEvent("pendown", {
          detail: {
            x: window.devicePixelRatio*(event.clientX - rect.x),
            y: window.devicePixelRatio*(event.clientY - rect.y),
          }
        }));
      }
    };
  }

  onmouseup(that) {
    return event => {
      event.preventDefault();

      that.action = null;
      if (that.keyboard.modifiers.shift) {
        that.cursor.setCursor("grab");
      } else {
        that.cursor.setCursor("");
      }

      event.target.dispatchEvent(new CustomEvent("penup"));
    };
  }

  onmousemove(that) {
    return event => {
      event.preventDefault();
      if (that.action === 'draw') {
        const rect = event.target.getBoundingClientRect();
        event.target.dispatchEvent(new CustomEvent("penmove", {
          detail: {
            x: window.devicePixelRatio*(event.clientX - rect.x),
            y: window.devicePixelRatio*(event.clientY - rect.y),
            force: 0.2
          }
        }));
      } else if (that.action === 'move') {
        const delta = {
          x: window.devicePixelRatio*(event.clientX - that.movePosition.x),
          y: window.devicePixelRatio*(event.clientY - that.movePosition.y)
        }
        that.movePosition = {
          x: window.devicePixelRatio*event.clientX,
          y: window.devicePixelRatio*event.clientY
        };
        event.target.dispatchEvent(new CustomEvent("pan", { detail: delta }));
      }
    };
  }

  onmouseout(event) {
    event.preventDefault();
    event.target.dispatchEvent(new CustomEvent("penup"));
  }

  onwheel(event) {
    event.preventDefault();
    let rect = event.target.getBoundingClientRect();
    event.target.dispatchEvent(new CustomEvent("zoom", { detail: {
      scale: 1 - (event.deltaY / 500),
      center: {
        x: window.devicePixelRatio*(event.clientX - rect.x),
        y: window.devicePixelRatio*(event.clientY - rect.y)
      }
    }}))
  }
}

class TouchInput {
  constructor(target) {
    this.numTouches = 0;
    this.drawing = false;
    this.gesturePosition = { x: 0, y: 0 };
    this.scale = 1;

    target.addEventListener("touchstart", this.ontouchstart);
    target.addEventListener("touchend", this.ontouchend);
    target.addEventListener("touchmove", this.ontouchmove);
    target.addEventListener("touchcancel", this.ontouchcancel);
    target.addEventListener("gesturestart", this.ongesturestart);
    target.addEventListener("gesturechange", this.ongesturechange);
    target.addEventListener("gestureend", this.ongestureend);
  }

  ontouchstart(event) {
    event.preventDefault();
    this.numTouches = event.touches.length;

    // We only want to draw with the stylus, not our fingers, so we check for
    // a "stylus" type
    let stylus = Array.from(event.touches).find(t => t.touchType === "stylus");
    if (stylus) {
      this.drawing = true;
      let rect = event.target.getBoundingClientRect();
      event.target.dispatchEvent(new CustomEvent("pendown", {
        detail: {
          x: window.devicePixelRatio*(stylus.clientX - rect.x),
          y: window.devicePixelRatio*(stylus.clientY - rect.y),
        }
      }));
    } else if (this.numTouches === 1) {
      this.gesturePosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if (this.numTouches === 2) {
      this.gesturePosition = {
        x: 0.5*(event.touches[0].clientX + event.touches[1].clientX),
        y: 0.5*(event.touches[0].clientY + event.touches[1].clientY)
      };
      this.scale = 1;
    }
  }

  ontouchend(event) {
    event.preventDefault(); // prevents scrolling, zooming, etc.
    if (this.drawing) {
      this.drawing = false;
      event.target.dispatchEvent(new CustomEvent("penup"));
    }
  }

  ontouchmove(event) {
    // Again, only look for "stylus" touches
    let stylus = Array.from(event.touches).find(t => t.touchType === "stylus");
    if (stylus) {
      event.preventDefault(); // prevents scrolling, zooming, etc.
      let rect = event.target.getBoundingClientRect();
      event.target.dispatchEvent(new CustomEvent("penmove", {
        detail: {
          x: window.devicePixelRatio*(stylus.clientX - rect.x),
          y: window.devicePixelRatio*(stylus.clientY - rect.y),
          force: stylus.force
        }
      }));
    } else if (this.numTouches === 1) {
      const delta = {
        x: window.devicePixelRatio*(event.touches[0].clientX - this.gesturePosition.x),
        y: window.devicePixelRatio*(event.touches[0].clientY - this.gesturePosition.y)
      };
      this.gesturePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      event.target.dispatchEvent(new CustomEvent("pan", {detail: delta }));
    } else if (this.numTouches === 2) {
      this.gesturePosition = {
        x: 0.5*(event.touches[0].clientX + event.touches[1].clientX),
        y: 0.5*(event.touches[0].clientY + event.touches[1].clientY)
      };
    }
  }

  ontouchcancel(event) {
    event.preventDefault();
    event.target.dispatchEvent(new CustomEvent("penup"));
  }

  ongesturestart(event) {
    event.preventDefault();
  }

  ongesturechange(event) {
    event.preventDefault();
    const scaleDelta = event.scale / this.scale;
    this.scale = event.scale;
    event.target.dispatchEvent(new CustomEvent("zoom", { detail: {
      scale: scaleDelta,
      center: {
        x: window.devicePixelRatio * this.gesturePosition.x,
        y: window.devicePixelRatio * this.gesturePosition.y
      }
    }}));
  }

  ongestureend(event) {
    event.preventDefault();
    if (event.scale < 0.95 || event.scale > 1.05) {
      // event.target.dispatchEvent(new CustomEvent("zoomend", { detail: event.scale }));
    } else {
      // tap
      if (this.numTouches === 2) {
        event.target.dispatchEvent(new CustomEvent("undo"));
      } else if (this.numTouches === 3) {
        event.target.dispatchEvent(new CustomEvent("redo"));
      }
    }
  }

}

class KeyboardInput {
  constructor(target, cursor) {
    this.modifiers = {
      shift: false,
      alt: false,
      meta: false,
      control: false
    };
    this.cursor = cursor;

    this.onkeydown = this.onkeydown.bind(this);
    this.onkeyup = this.onkeyup.bind(this);

    window.addEventListener("keydown", this.onkeydown(target));
    window.addEventListener("keyup", this.onkeyup(target));
  }

  onkeydown(target) {
    const that = this;
    return (event) => {
      if (event.shiftKey && !that.modifiers.shift) {
        that.modifiers.shift = true;
        that.cursor.setCursor("grab");
      }
      if (event.metaKey && !event.shiftKey && event.key === 'z') {
        target.dispatchEvent(new CustomEvent("undo"));
      } else if (event.metaKey && event.shiftKey && event.key === 'z') {
        target.dispatchEvent(new CustomEvent("redo"));
      }
    }
  }

  onkeyup(target) {
    const that = this;
    return (event) => {
      if (!event.shiftKey && that.modifiers.shift) {
        that.modifiers.shift = false;
        that.cursor.setCursor("");
      }
    };
  }

}

class Cursor {
  constructor(element) {
    this.element = element;
    this.setCursor = this.setCursor.bind(this);
  }

  setCursor(cursor) {
    this.element.style.cursor = cursor;
  }
}

class NotepadCanvas {
  /* This handles all the drawing stuff.
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.bounds = {
      left: -10000,
      top: -10000,
      right: 10000,
      bottom: 10000
    };

    this.drawTo = this.drawTo.bind(this);
    this.drawStroke = this.drawStroke.bind(this);
    this.prepareStroke = this.prepareStroke.bind(this);
    this.refresh = this.refresh.bind(this);
    this.clear = this.clear.bind(this);
    this.scaleBy = this.scaleBy.bind(this);
    this.drawGrid = this.drawGrid.bind(this);
    this.panBy = this.panBy.bind(this);
    this.applyTransform = this.applyTransform.bind(this);
    this.reset = this.reset.bind(this);
  }

  drawTo(brush, point) {
    brush.drawTo(point, this.context);
  }

  drawStroke(stroke) {
    // Move to the first point, and call `drawTo` on the rest.
    if (stroke.points.length > 1) {
      // const brush = new PenBrush();
      this.prepareStroke(stroke);
      const brush = Brush.getBrush(stroke.brush, stroke);
      brush.setPosition(stroke.points[0]);
      for(let i = 1; i < stroke.points.length; i++) {
        this.drawTo(brush, stroke.points[i]);
      }
    }
  }

  prepareStroke(stroke) {
    this.context.strokeStyle = stroke.color;
    this.context.fillStyle = stroke.color;
  }

  refresh(strokeHistory) {
    // Clears the canvas and draws all of the current strokes again. Useful for
    // updating the canvas after undo or redo.
    this.clear();
    this.drawGrid();
    strokeHistory.currentStrokes().map(this.drawStroke);
  }

  clear() {
    this.context.clearRect(this.bounds.left, this.bounds.top,
        this.bounds.right - this.bounds.left, this.bounds.bottom - this.bounds.top);
  }

  scaleBy(amount) {
    this.context.translate(amount.center.x, amount.center.y);
    this.context.scale(amount.scale, amount.scale);
    this.context.translate(-amount.center.x, -amount.center.y);
  }

  panBy(delta) {
    this.context.translate(delta.x, delta.y);
  }

  drawGrid() {
    this.context.globalCompositeOperation = "source-over";
    this.context.fillStyle = 'black';
    for (let x = this.bounds.left; x < this.bounds.right; x += 100) {
      for (let y = this.bounds.top; y < this.bounds.bottom; y += 100) {
        this.context.fillRect(x, y, window.devicePixelRatio*2, window.devicePixelRatio*2);
      }
    }
  }

  applyTransform(point) {
    const matrix = this.context.getTransform();
    return {
      ...point,
      x: (point.x - matrix.e)/matrix.a,
      y: (point.y - matrix.f)/matrix.d
    };
  }

  reset() {
    this.context.setTransform(1, 0, 0, 1, 0, 0);
  }

}

class Brush {
  static getBrush = (brushName, stroke) => {
    switch (brushName) {
      case "pen":
        return new PenBrush(stroke);
      case "eraser":
        return new EraserBrush(stroke);
      default:
        console.warn("Brush not found:", brushName);
    }
  };
}

class PenBrush {
  constructor(opts) {
    opts = opts || {};
    this.brushName = 'pen';
    this.position = { x: 0, y: 0 };
    this.control = { x: 0, y: 0 };
    this.minWidth = opts.minWidth || 0;
    this.maxWidth = opts.size || 16;

    this.getWidth = this.getWidth.bind(this);
    this.setPosition = this.setPosition.bind(this);
    this.drawTo = this.drawTo.bind(this);
  }

  setPosition(point) {
    this.position = { x: point.x, y: point.y };
    this.control = { x: point.x, y: point.y };
  }

  getWidth(force) {
    // Linear interpolation
    // return this.minWidth + force * (this.maxWidth - this.minWidth);

    // Deceleration interpolation
    return this.minWidth + (1 - Math.pow(1 - force, 2)) * (this.maxWidth - this.minWidth);
  }

  drawTo(point, context) {
    context.globalCompositeOperation = "source-over";
    context.lineWidth = this.getWidth(point.force);

    context.beginPath();

    context.moveTo(this.position.x, this.position.y);

    // Get the midpoint between our last saved control point and the new one.
    // This will be where the curve draws to.
    let newPoint = {
      x: 0.5*(point.x + this.control.x),
      y: 0.5*(point.y + this.control.y)
    };

    // Draw the curve to the new midpoint, using our last saved control point
    context.quadraticCurveTo(this.control.x, this.control.y, newPoint.x, newPoint.y);

    context.stroke();
    context.closePath();

    // Update pen position and control points
    this.position = { x: newPoint.x, y: newPoint.y };
    this.control = { x: point.x, y: point.y };
  }
}

class EraserBrush {
  constructor(opts) {
    opts = opts || {};
    this.brushName = "eraser";
    this.size = opts.size || 8;

    this.setPosition = this.setPosition.bind(this);
    this.drawTo = this.drawTo.bind(this);
  }

  setPosition(point) {
    this.position = { x: point.x, y: point.y };
    this.control = { x: point.x, y: point.y };
  }

  drawTo(point, context) {
    context.beginPath();
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = "rgba(255,255,255,1)";

    context.arc(point.x, point.y, this.size, 2*Math.PI, false);

    context.fill();
  }
}

class Notepad {
  /* This is the main class that ties everything together, like a controller.
   * Basically, it defines some custom events, sets up input handlers to fire
   * those events when appropriate, and defines what happens on each event. It
   * also keeps track of the stroke currently being drawn.
   */

  constructor(canvasEl, imageData) {
    this.penDown = this.penDown.bind(this);
    this.penUp = this.penUp.bind(this);
    this.penMove = this.penMove.bind(this);
    this.undo = this.undo.bind(this);
    this.redo = this.redo.bind(this);
    this.getImageData = this.getImageData.bind(this);
    this.addStroke = this.addStroke.bind(this);
    this.resize = this.resize.bind(this);
    this.setOption = this.setOption.bind(this);
    this.zoom = this.zoom.bind(this);
    this.pan = this.pan.bind(this);
    this.reset = this.reset.bind(this);

    this.canvasEl = canvasEl;
    this.isDrawing = false;
    this.brush = null;
    this.canvas = new NotepadCanvas(canvasEl);
    this.canvasEl = canvasEl;
    this.strokeHistory = new StrokeHistory(imageData.strokes);
    this.curStroke = {
      color: 'black',
      brush: 'pen',
      size: 8,
      points: []
    }; // holds the stroke currently being drawn

    // These are our custom events
    new Event("pendown");
    new Event("penup");
    new Event("penmove");
    new Event("undo");
    new Event("redo");
    new Event("zoom");
    new Event("pan");
    new Event("notepad:ready");
    new Event("notepad:stroke");

    // Set up the input handlers
    const cursor = new Cursor(canvasEl);
    const keyboard = new KeyboardInput(canvasEl, cursor);
    const mouse = new MouseInput(canvasEl, keyboard, cursor);
    const touch = new TouchInput(canvasEl);

    // Bind our methods to our custom events
    canvasEl.addEventListener("pendown", this.penDown);
    canvasEl.addEventListener("penup", this.penUp);
    canvasEl.addEventListener("penmove", this.penMove);
    canvasEl.addEventListener("undo", () => this.broadcast("undo"));
    canvasEl.addEventListener("redo", () => this.broadcast("redo"));
    canvasEl.addEventListener("zoom", this.zoom);
    canvasEl.addEventListener("pan", this.pan);

    // Refresh the canvas in case we had some initial stroke data
    this.resize();
    this.broadcast("ready", this);
  }

  penDown(event) {
    const point = this.canvas.applyTransform(event.detail);
    this.isDrawing = true;
    this.canvas.prepareStroke(this.curStroke);
    this.curStroke.points.push(point);
    this.brush = Brush.getBrush(this.curStroke.brush, this.curStroke);
    this.brush.setPosition(point);
  }

  penUp(event) {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.broadcast("stroke", { stroke: this.curStroke });
      this.curStroke.points = [];
    }
  }

  penMove(event) {
    if (this.isDrawing) {
      const point = this.canvas.applyTransform(event.detail);
      this.canvas.drawTo(this.brush, point);
      this.curStroke.points.push(point);
    }
  }

  undo() {
    this.strokeHistory.undo();
    this.canvas.refresh(this.strokeHistory);
  }

  redo() {
    this.strokeHistory.redo();
    this.canvas.refresh(this.strokeHistory);
  }

  getImageData() {
    return {
      strokes: this.strokeHistory.currentStrokes()
    };
  }

  addStroke(stroke) {
    this.strokeHistory.addStroke(stroke);
    this.canvas.refresh(this.strokeHistory);
  }

  resize() {
    // Here we set the canvas's logical pixels to match the actual number of
    // device pixels. We have to adjust the style size to compensate.
    let rect = this.canvasEl.getBoundingClientRect();
    this.canvasEl.width = window.devicePixelRatio*rect.width;
    this.canvasEl.height = window.devicePixelRatio*rect.height;
    this.canvasEl.style.width = rect.width + "px";
    this.canvasEl.style.height = rect.height + "px";

    this.canvas.refresh(this.strokeHistory);
  }

  broadcast(event, data) {
    document.dispatchEvent(new CustomEvent(`notepad:${event}`, {
      detail: data
    }));
  }

  setOption(option, value) {
    switch(option) {
      case "brush":
        this.curStroke.brush = value;
        break;
      case "color":
        this.curStroke.color = value;
        break;
      case "brushSize":
        this.curStroke.size = value;
        break;
      default:
        console.warn("Unrecognized notepad option:", option);
    }
  }

  zoom(event) {
    const scaleAmount = {
      ...event.detail,
      center: this.canvas.applyTransform(event.detail.center)
    };
    this.canvas.scaleBy(scaleAmount);
    this.canvas.refresh(this.strokeHistory);
  }

  pan(event) {
    this.canvas.panBy(event.detail);
    this.canvas.refresh(this.strokeHistory);
  }

  reset() {
    this.strokeHistory.clear();
    this.canvas.reset();
    this.canvas.refresh(this.strokeHistory);
  }

}
