
const _gridStyles = `
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

  .playgrid_hide {
    display: none;
  }
`;

class Grid {

  //// CONFIGURATION

  // containerID: string;
  // width: number;
  // height: number;
  // enforceBoundaries: boolean;
  // alertOnError: boolean;

  //// INSTANCE STATE

  useGrid1 = true; // whether plotting on frame 1

  //// CACHED VALUES

  // container: HTMLElement; // ref to the provided grid container
  // grid1?: HTMLElement; // ref to grid1 for pingponging rendering
  // grid2?: HTMLElement; // ref to grid2 for pingponging rendering
  // table1?: HTMLElement; // ref to <table> DOM node in grid1
  // table2?: HTMLElement; // ref to <table> DOM node in grid2
  // rows1?: HTMLCollection; // ref to array of <tr> DOM nodes in grid1
  // rows2?: HTMLCollection; // ref to array of <tr> DOM nodes in grid2

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
    if (["undefined", "boolean"].indexOf(typeof config.enforceBoundaries) == -1) {
      this._error("enforceBoundaries must be a boolean");
    }
    if (["undefined", "boolean"].indexOf(typeof config.alertOnError) == -1) {
      this._error("errorAlerts must be a boolean");
    }

    this.containerID = containerID;
    this.width = config.width;
    this.height = config.height;
    this.enforceBoundaries = config.enforceBoundaries ?? true;
    this.alertOnError = config.alertOnError ?? true;

    this._addStyles(_gridStyles);

    this.container = document.getElementById(this.containerID);
    if (this.container == null) {
      this._error(`cannot find container element with ID "${this.containerID}"`);
    }
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
    this._setGridAspectRatio();
    window.addEventListener("resize", () => this._setGridAspectRatio());
  }

  //// PUBLIC METHODS

  clear() {
    const rows = this.useGrid1 ? this.rows1 : this.rows2;
    for (let r = 0; r < this.height; ++r) {
      const targetCells = rows[r].children;
      for (let c = 0; c < this.width; ++c) {
        targetCells[c].className = "";
      }
    }
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
    for (let r = 0; r < this.height; ++r) {
      html += "<tr>";
      for (let c = 0; c < this.width; ++c) {
        html += "<td></td>";
      }
      html += "</tr>\n";
    }
    html += "</table></div>\n";
    return this._createElementFromHTML(html);
  }

  _setGridAspectRatio() {
    const rect = this.container.getBoundingClientRect();
    this._setAspectRatio(this.table1, rect);
    this._setAspectRatio(this.table2, rect);
  }
  
  _setAspectRatio(child, rect) {
    // CSS solutions were too hard to make behave as expected
    const aspectRatio = this.width / this.height;
    let adjustedWidth = rect.right - rect.left;
    let adjustedHeight = adjustedWidth / aspectRatio;
    if (adjustedHeight > rect.bottom - rect.top) {
      adjustedHeight = rect.bottom - rect.top;
      adjustedWidth = adjustedHeight * aspectRatio;
    }
    child.style.width = adjustedWidth + "px";
    child.style.height = adjustedHeight + "px";
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
        (x < 0 || x >= this.width || y < 0 || y >= this.height);
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
