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
    const $toolTargets = Array.from(document.querySelectorAll(`input[data-for-notepad=${notepadName}]`));
    $toolTargets.map($tool => {
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
}

class MouseInput {
  /* This translates mouse events into our custom notepad events. Since a mouse
   * doesn't support pressure-sensitivity, we hard-code the value 0.2 for force
   * (see "onmousemove").
   *
   * X and Y coordinates are reported relative to the top-left corner of the
   * canvas in "pendown" and "penmove" custom events. They're also scaled
   * according to the devices pixel ratio, to support retina displays.
   */

  constructor(target) {
    target.addEventListener("mousedown", this.onmousedown);
    target.addEventListener("mouseup", this.onmouseup);
    target.addEventListener("mousemove", this.onmousemove);
    target.addEventListener("mouseout", this.onmouseout);
  }

  onmousedown(event) {
    event.preventDefault();
    let rect = event.target.getBoundingClientRect(); // canvas rectangle
    event.target.dispatchEvent(new CustomEvent("pendown", {
      detail: {
        x: window.devicePixelRatio*(event.clientX - rect.x),
        y: window.devicePixelRatio*(event.clientY - rect.y),
      }
    }));
  }

  onmouseup(event) {
    event.preventDefault();
    event.target.dispatchEvent(new CustomEvent("penup"));
  }

  onmousemove(event) {
    event.preventDefault();
    let rect = event.target.getBoundingClientRect();
    event.target.dispatchEvent(new CustomEvent("penmove", {
      detail: {
        x: window.devicePixelRatio*(event.clientX - rect.x),
        y: window.devicePixelRatio*(event.clientY - rect.y),
        force: 0.2
      }
    }));
  }

  onmouseout(event) {
    event.preventDefault();
    event.target.dispatchEvent(new CustomEvent("penup"));
  }
}

class StylusInput {
  /* This translates touch events into our custom notepad events.
   *
   * X and Y coordinates are reported relative to the top-left corner of the
   * canvas in "pendown" and "penmove" custom events. They're also scaled
   * according to the devices pixel ratio, to support retina displays. This is
   * why strokes look jagged on an iPad — the browser reports the "CSS pixel"
   * location of touch events, not the actual retina pixel value, so when we
   * scale it up by the device pixel ratio, the pixels look chunky.
   */

  constructor(target) {
    target.addEventListener("touchstart", this.ontouchstart);
    target.addEventListener("touchend", this.ontouchend);
    target.addEventListener("touchmove", this.ontouchmove);
    target.addEventListener("touchcancel", this.ontouchcancel);
  }

  ontouchstart(event) {
    // We only want to draw with the stylus, not our fingers, so we check for
    // a "stylus" type
    let stylusTouch = Array.from(event.touches).find(t => t.touchType === "stylus");
    if (stylusTouch) {
      event.preventDefault(); // prevents scrolling, zooming, etc.
      let rect = event.target.getBoundingClientRect();
      event.target.dispatchEvent(new CustomEvent("pendown", {
        detail: {
          x: window.devicePixelRatio*(stylusTouch.clientX - rect.x),
          y: window.devicePixelRatio*(stylusTouch.clientY - rect.y),
        }
      }));
    } else {
      // We touched with fingers, so let's check for undo and redo taps
      if (event.touches.length == 2) {
        event.target.dispatchEvent(new CustomEvent("undo"));
      } else if (event.touches.length == 3) {
        event.target.dispatchEvent(new CustomEvent("redo"));
      }
    }
  }

  ontouchend(event) {
    event.preventDefault();
    event.target.dispatchEvent(new CustomEvent("penup"));
  }

  ontouchmove(event) {
    // Again, only look for "stylus" touches
    let touch = Array.from(event.touches).find(t => t.touchType === "stylus");
    if (touch) {
      event.preventDefault(); // prevents scrolling, zooming, etc.
      let rect = event.target.getBoundingClientRect();
      event.target.dispatchEvent(new CustomEvent("penmove", {
        detail: {
          x: window.devicePixelRatio*(touch.clientX - rect.x),
          y: window.devicePixelRatio*(touch.clientY - rect.y),
          force: touch.force
        }
      }));
    }
  }

  ontouchcancel(event) {
    event.preventDefault();
    event.target.dispatchEvent(new CustomEvent("penup"));
  }
}

class KeyboardInput {
  /* This translates keyboard events into our custom notepad events. We use it
   * for undo/redo with cmd+z and cmd+shift+z
   */

  constructor(target) {
    // We attach the event listener to the window, since you can't capture
    // keyboard events on a canvas. To keep a reference to the canvas, we'll
    // save it in a closure
    window.addEventListener("keydown", this.onkeydown(target));
  }

  onkeydown(target) {
    return (event) => {
      if (event.metaKey && !event.shiftKey && event.key === 'z') {
        target.dispatchEvent(new CustomEvent("undo"));
      } else if (event.metaKey && event.shiftKey && event.key === 'z') {
        target.dispatchEvent(new CustomEvent("redo"));
      }
    }
  }
}

class NotepadCanvas {
  /* This handles all the drawing stuff.
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');

    this.drawTo = this.drawTo.bind(this);
    this.drawStroke = this.drawStroke.bind(this);
    this.refresh = this.refresh.bind(this);
    this.clear = this.clear.bind(this);
  }

  drawTo(brush, point) {
    brush.drawTo(point, this.context);
  }

  drawStroke(stroke) {
    // Move to the first point, and call `drawTo` on the rest.
    if (stroke.points.length > 1) {
      // const brush = new PenBrush();
      const brush = Brush.getBrush(stroke.brush);
      brush.setPosition(stroke.points[0]);
      for(let i = 1; i < stroke.points.length; i++) {
        this.drawTo(brush, stroke.points[i]);
      }
    }
  }

  refresh(strokeHistory) {
    // Clears the canvas and draws all of the current strokes again. Useful for
    // updating the canvas after undo or redo.
    this.clear();
    strokeHistory.currentStrokes().map(this.drawStroke);
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

}

class Brush {
  static getBrush = brushName => {
    switch (brushName) {
      case "pen":
        return new PenBrush();
      case "eraser":
        return new EraserBrush();
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
    this.maxWidth = opts.maxWidth || 8;

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
    return this.minWidth + force * (this.maxWidth - this.minWidth);

    // Deceleration interpolation
    // return this.minWidth + (1 - Math.pow(1 - force, 2)) * (this.maxWidth - this.minWidth);
  }

  drawTo(point, context) {
    context.beginPath();
    context.strokeStyle = 'black';
    context.globalCompositeOperation = "source-over";
    context.lineWidth = this.getWidth(point.force);

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
    this.size = opts.size || 30;

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
    this.setBrush = this.setBrush.bind(this);

    this.canvasEl = canvasEl;
    this.isDrawing = false;
    this.brush = new PenBrush();
    this.canvas = new NotepadCanvas(canvasEl);
    this.strokeHistory = new StrokeHistory(imageData.strokes);
    this.curStroke = {
      color: 'black',
      brush: this.brush.brushName,
      points: []
    }; // holds the stroke currently being drawn

    this.resize();

    // These are our custom events
    new Event("pendown");
    new Event("penup");
    new Event("penmove");
    new Event("undo");
    new Event("redo");
    new Event("notepad:ready");
    new Event("notepad:stroke");

    // Set up the input handlers
    this.mouse = new MouseInput(canvasEl);
    this.stylus = new StylusInput(canvasEl);
    this.keyboard = new KeyboardInput(canvasEl);

    // Bind our methods to our custom events
    canvasEl.addEventListener("pendown", this.penDown);
    canvasEl.addEventListener("penup", this.penUp);
    canvasEl.addEventListener("penmove", this.penMove);
    canvasEl.addEventListener("undo", () => this.broadcast("undo"));
    canvasEl.addEventListener("redo", () => this.broadcast("redo"));

    // Refresh the canvas in case we had some initial stroke data
    this.resize();
    this.broadcast("ready", this);
  }

  penDown(event) {
    this.isDrawing = true;
    this.brush.setPosition(event.detail);
    this.curStroke.brush = this.brush.brushName;
    this.curStroke.points.push(event.detail);
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
      this.canvas.drawTo(this.brush, event.detail);
      this.curStroke.points.push(event.detail);
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
        this.setBrush(value);
        break;
      case "color":
        this.pen.setColor(value);
        break;
      default:
        console.warn("Unrecognized notepad option:", option);
    }
  }

  setBrush(brushName) {
    switch (brushName) {
      case "pen":
        this.brush = new PenBrush();
        break;
      case "eraser":
        this.brush = new EraserBrush();
        break;
      default:
        console.warn("Unrecognized brush selected:", brushName);
    }
  }

}
