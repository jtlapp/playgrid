
const _playgridGridStyles = `
  .playgrid_wrapper {
    position: relative;
  }

  .playgrid_gridframe {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
  }

  .playgrid_gridframe table,
  .playgrid_gridframe table tr,
  .playgrid_gridframe table td {
    border: none;
    border-spacing: 0;
    padding: 0;
    margin: auto;
  }

  .playgrid_wrapper img {
    position: absolute;
  }

  .playgrid_hide {
    display: none;
  }
`;

class Grid {

  //// CONFIGURATION

  // containerID: string;
  // width: number;
  // height: number;
  // sizeImagesByCanvas: boolean;
  // enforceBoundaries: boolean;
  // alertOnError: boolean;

  //// INSTANCE STATE

  useGrid1 = true; // whether plotting on frame 1
  images = []; // images for repositioning on resize

  //// CACHED VALUES

  // container: HTMLElement; // ref to the provided grid container
  // grid1?: HTMLElement; // ref to grid1 for pingponging rendering
  // grid2?: HTMLElement; // ref to grid2 for pingponging rendering
  // table1?: HTMLElement; // ref to <table> DOM node in grid1
  // table2?: HTMLElement; // ref to <table> DOM node in grid2
  // rows1?: HTMLCollection; // ref to array of <tr> DOM nodes in grid1
  // rows2?: HTMLCollection; // ref to array of <tr> DOM nodes in grid2
  // pixelEdge: number; // length of an edge of a pixel cell
  // topLeftX: number; // x-coord of top left of grid
  // topLeftY: number; // y-coord of tope left of grid

  //// CONSTRUCTION

  constructor(containerID, config) {

    // Only call after page has loaded.

    // config has type {
    //   width: number,
    //   height: number,
    //   enforceBoundaries: boolean,
    //   alertOnError: boolean
    // }
    
    // Helpfully guard calls that students make from JavaScript.

    if (typeof containerID != "string" || containerID.length == 0) {
      this._error("containerID must be the value of an HTML 'id' attribute");
    }
    if (isNaN(config.width) || isNaN(config.height)) {
      this._error("width and height must be numbers");
    }
    if (config.width < 1 || config.height < 1) {
      this._error("width and height must be >= 1");
    }
    if (["undefined", "boolean"].indexOf(typeof config.sizeImagesByCanvas) == -1) {
      this._error("sizeImagesByCanvas must be a boolean");
    }
    if (["undefined", "boolean"].indexOf(typeof config.enforceBoundaries) == -1) {
      this._error("enforceBoundaries must be a boolean");
    }
    if (["undefined", "boolean"].indexOf(typeof config.alertOnError) == -1) {
      this._error("errorAlerts must be a boolean");
    }

    this.containerID = containerID;
    this.pixelWidth = config.width;
    this.pixelHeight = config.height;
    this.sizeImagesByCanvas = config.sizeImagesByCanvas ?? false;
    this.enforceBoundaries = config.enforceBoundaries ?? true;
    this.alertOnError = config.alertOnError ?? true;

    this._addStyles(_playgridGridStyles);

    this.container = document.getElementById(this.containerID);
    if (this.container == null) {
      this._error(`cannot find container element with ID "${this.containerID}"`);
    }
    // TBD: I should be prepending these elements so user divs are visible
    this.container.classList.add("playgrid_wrapper");
    this.grid1 = this._createGridElement();
    this.table1 = this.grid1.firstElementChild;
    this.rows1 = this.table1.children[0].children;
    this.container.append(this.grid1);
    this.grid2 = this._createGridElement();
    this.table2 = this.grid2.firstElementChild;
    this.rows2 = this.table2.children[0].children;
    this.grid2.classList.add("playgrid_hide");
    this.container.append(this.grid2);
    this._resizeGrid();
    window.addEventListener("resize", () => this._resizeGrid());
  }

  //// PUBLIC METHODS

  clear() {
    const rows = this.useGrid1 ? this.rows1 : this.rows2;
    for (let r = 0; r < this.pixelHeight; ++r) {
      const targetCells = rows[r].children;
      for (let c = 0; c < this.pixelWidth; ++c) {
        targetCells[c].className = "";
      }
    }
  }

  centerImage(x, y, sizePercent, url /*, verticalShiftPercent*/) {
    this._validatePoint(x, y);
    if (isNaN(sizePercent) || sizePercent <= 0) {
      this._error("image sizePercent must a number be > 0");
    }
    if (this.sizeImagesByCanvas && sizePercent > 100) {
      this._error("image sizePercent must be <= 100");
    }
    // if (isNaN(verticalShift)) {
    //   this._error("image verticalShift must a number");
    // }
    if (typeof url != "string" || url == "") {
      this._error("image requires a non-empty url");
    }

    const grid = this;
    const imageElement = this._createElementFromHTML(`<img src="${url}" />`);
    this.container.append(imageElement);

    const image = new Image();
    image.src = url;
    image.onload = function() { // must be a "function"
      const config = {
        width: this.width,
        height: this.height,
        x: x,
        y: y,
        sizePercent: sizePercent,
        element: imageElement
      };
      grid.images.push(config);
      grid._positionImage(config);
    };
  }
  
  plot(x, y, color) {
    // Helpfully guard calls that students make from JavaScript.
    const withinBoundaries = this._validatePoint(x, y);
    this._validateColor(color);

    if (withinBoundaries) {
      const rows = this.useGrid1 ? this.rows1 : this.rows2;
      rows[Math.floor(y)].children[Math.floor(x)].className = color;
    }
  }
    
  swap() {
    if (this.useGrid1) {
      this.grid1.classList.add("playgrid_hide");
      this.grid2.classList.remove("playgrid_hide");
    } else {
      this.grid2.classList.add("playgrid_hide");
      this.grid1.classList.remove("playgrid_hide");
    }
    this.useGrid1 = !this.useGrid1;
  }

  //// PRIVATE METHODS

  _addStyles(styles) {
    const stylesheet = document.createElement("style");
    stylesheet.type = "text/css";
    stylesheet.innerText = styles;
    document.head.appendChild(stylesheet);
  }
  
  _createElementFromHTML(html) {
    let template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild;
  }

  _createGridElement() {
    // Class playgrid_canvas allows app to modify style without
    // being dependent on the table implmentation.
    let html = "<div class='playgrid_gridframe'><table class='playgrid_canvas'>\n";
    for (let r = 0; r < this.pixelHeight; ++r) {
      html += "<tr>";
      for (let c = 0; c < this.pixelWidth; ++c) {
        html += "<td></td>";
      }
      html += "</tr>\n";
    }
    html += "</table></div>\n";
    return this._createElementFromHTML(html);
  }

  _positionImage(config) {

    // Determine rendered width and height of image.

    const maxEdge = Math.round(this.sizeImagesByCanvas
      ? this.width * this.pixelEdge * config.sizePercent/100
      : this.pixelEdge * config.sizePercent/100);
    let width = Math.min(maxEdge, config.width);
    let height = config.height * width / config.width;
    if (height > maxEdge) {
      height = maxEdge;
      width = config.width * height / config.height;
    }

    const centerX = this.topLeftX + (config.x + 0.5) * this.pixelEdge;
    const centerY = /*this.topLeftY +*/ (config.y + 0.5) * this.pixelEdge;

    const style = config.element.style;
    style.width = Math.round(width) + "px";
    style.height = Math.round(height) + "px";
    style.left = Math.round(centerX - width / 2) + "px";
    style.top = Math.round(centerY - height / 2) + "px";
  }

  _resizeGrid() {

    // Compute new grid dimensions in screen pixels.

    const wrapperRect = this.container.getBoundingClientRect();
    // CSS solutions were too hard to make behave as expected
    const aspectRatio = this.pixelWidth / this.pixelHeight;
    let adjustedWidth = wrapperRect.right - wrapperRect.left;
    let adjustedHeight = adjustedWidth / aspectRatio;
    if (adjustedHeight > wrapperRect.bottom - wrapperRect.top) {
      adjustedHeight = wrapperRect.bottom - wrapperRect.top;
      adjustedWidth = adjustedHeight * aspectRatio;
    }
    this.pixelEdge = adjustedWidth / this.pixelWidth;

    // Size the canvases to the new dimensions.

    const widthPx = adjustedWidth + "px";
    const heightPx = adjustedHeight + "px";
    this.table1.style.width = widthPx;
    this.table1.style.height = heightPx;
    this.table2.style.width = widthPx;
    this.table2.style.height = heightPx;

    // Reposition the images.
    
    const gridRect = this.table1.getBoundingClientRect();
    this.topLeftX = gridRect.left - wrapperRect.left;
    this.topLeftY = gridRect.top - wrapperRect.top;
    for (let i = 0; i < this.images.length; ++i) {
      this._positionImage(this.images[i]);
    }
  }
  
  _validateColor(color) {
    if (color != null && (typeof color != "string" || color.length == 0)) {
      this._error("color must either be null or a CSS class name");
    }
  }

  _validatePoint(x, y) {
    if (isNaN(x) || isNaN(y)) {
      this._error("x and y must be numbers");
    }
    const outsideBoundaries = 
        (x < 0 || x >= this.pixelWidth || y < 0 || y >= this.pixelHeight);
    if (this.enforceBoundaries && outsideBoundaries) {
      this._error(`location (${x}, ${y}) is not on the grid`);
    }
    return !outsideBoundaries;
  }

  _error(message) {
    if (this.alertOnError) {
      alert("ERROR: " + message);
    }
    throw Error(message);
  }
}
