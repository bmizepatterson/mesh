// Global variables
var Cells = [];
var Dendrites = [];
var drawingDendrite = false;
var ctx = document.getElementById("workspace").getContext("2d");
var debug = document.getElementById("debugspace");
var highlightedCell = -1;
var selectedCell = -1;
var textAlign = 'center';
var font = '12px sans-serif';
var textFill = '#000';
var arrowWidth = 7;
var highlightWidth = 3;
var highlightOffset = 5;
var selectColor = '#3f51b5';
var cellColor = '#000';
var highlightColor = '#3f51b5';
var dendriteColor = '#777';
var wedgeColor = 'rgb(50,50,50)';

// Utility functions
function load() {
	workspaceSetup();
	setInterval(watch, 100);
}

function distance(x1, y1, x2, y2) {
	// Use the distance formula to calculate the distance between two points.
	return Math.ceil(Math.sqrt(Math.pow((x2-x1),2) + Math.pow((y2-y1),2)));
}

function watch() {
	document.getElementById("drawingDendrite").innerHTML = drawingDendrite;
	document.getElementById("highlightedCell").innerHTML = highlightedCell;
	document.getElementById("selectedCell").innerHTML = selectedCell;
}

function checkForCollision(x,y) {
	var collision = false;
	for (var i = 0; i < Cells.length; i++) {
		if (distance(x, y, Cells[i].x, Cells[i].y) <= Cells[i].r) {
			// If the distance between the mouse and this cell's center is less than this cell's radius, then we have a collision.
			collision = Cells[i];
			break;
		}
	}
	return collision;
}

function clearWorkspace() {
	// Clear out arrays
	Cells = [];
	Dendrites = [];
	// Erase workspace
	ctx.clearRect(0,0,500,500);
	// Clear debug area
	debug.innerHTML = '';
	workspaceSetup();
}

// Object constructors
function Cell(x, y, r, threshold, firePower, ctx) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.threshold = threshold;	// Input needed before the cell will fire
	this.potential = 0;			// Input that has been collected so far
	this.firePower = firePower;	// Output released when the cell fires
	// this.inputCells = [];		// Array of cells that provide input to this cell
	// this.outputCells = [];		// Array of cells to which this cell provides input
	this.inputDendrites = [];	// Array of dendrites that connect input cells to this cell
	this.outputDendrites = [];  // Array of dendrites that connect this cell to its output cells
	this.highlighted = false;
	this.selected = false;
	this.ctx = ctx;				// The drawing context of the HTML canvas

	this.draw = function (color, fill) {
		this.ctx.beginPath();
		this.ctx.arc(this.x,this.y,this.r,0,2*Math.PI);
		if (fill) {
			this.ctx.fillStyle = color;
			this.ctx.fill();
		} else {
			this.ctx.strokeStyle = color;
			this.ctx.lineWidth = 1;
			this.ctx.stroke();
		}
		// Draw the wedge
		if (this.potential > 0) {
			this.drawPotentialWedge(ctx, false, 0, this.potential / this.threshold);
		}
	}

	this.drawPotentialWedge = function (animate, oldPotentialRatio = null, newPotentialRatio) {	
		if (animate && oldPotentialRatio == null) {
			console.log('oldPotentialRatio must be passed to Cell::drawPotentialWedge() if animating.');
		}
		this.ctx.fillStyle = this.selected ? '#fff' : wedgeColor;;
		var target = 1.5*Math.PI + (newPotentialRatio*2*Math.PI); // 1.5*PI starts us at the top of the circle. Dang radians.
		if (animate == true) {
			var start = 1.5*Math.PI + (oldPotentialRatio*2*Math.PI);
			// Instantly draw the old wedge, if any
			if (oldPotentialRatio > 0) {
				this.ctx.beginPath();
				this.ctx.moveTo(this.x, this.y);
				this.ctx.arc(this.x, this.y, this.r*0.75, 1.5*Math.PI, start);
				this.ctx.fill();
			}
			// Animate the drawing of the wedge that represents accumulated potential
			var progress = start;
			var cell = this;	// In the context of setInterval, 'this' refers to the window object, so copy the current this
			var wedgeAnimation = window.setInterval(function() {
						if (progress < target) {
							cell.ctx.beginPath();
							cell.ctx.moveTo(cell.x, cell.y);
							cell.ctx.arc(cell.x, cell.y, cell.r*0.75, start, progress);
							cell.ctx.fill();
						} else {
							// If we have reached threshold, then complete the wedge-circle and reset after a sec
							if (newPotentialRatio === 1) {
								cell.ctx.fillStyle = 'rgb(255,0,0)';
								cell.ctx.beginPath();
								cell.ctx.moveTo(cell.x, cell.y);
								cell.ctx.arc(cell.x, cell.y, cell.r*0.8, 0, 2*Math.PI);
								cell.ctx.fill();
								window.setTimeout(function() { cell.eraseInner(); } , 500);
							}
							// End animation
							clearInterval(wedgeAnimation);
						}
						progress = progress + 3*Math.PI / 180; // Increment by 3-degree intervals
				}, 20);
		} else {
			// Draw without animating
			this.ctx.beginPath();
			this.ctx.moveTo(this.x, this.y);
			this.ctx.arc(this.x, this.y, this.r*0.75, 1.5*Math.PI, target);
			this.ctx.fill();
		}		
	}

	this.redrawDendrites = function () {
		// First erase them, then draw them again
		for (var i = 0; i < this.inputDendrites.length; i++) {
			this.inputDendrites[i].draw('#fff', 3);
			this.inputDendrites[i].draw(dendriteColor, 1);
		}
		for (var i = 0; i < this.outputDendrites.length; i++) {
			this.outputDendrites[i].draw('#fff', 3);
			this.outputDendrites[i].draw(dendriteColor, 1);
		}
	}

	this.highlight = function () {
		// Set flags
		highlightedCell = this.id;
		this.highlighted = true;
		// Draw a circle around a cell to highlight it
		this.ctx.beginPath();
		this.ctx.strokeStyle = highlightColor;
		this.ctx.lineWidth = highlightWidth;
		this.ctx.arc(this.x, this.y, this.r+highlightOffset, 0, 2*Math.PI);
		this.ctx.stroke();
	}

	this.unhighlight = function () {
		// Set flags
		highlightedCell = -1;
		this.highlighted = false;
		// Cover up the circle around a cell
		this.ctx.beginPath();
		this.ctx.strokeStyle = '#fff';
		this.ctx.lineWidth = highlightWidth+2;
		this.ctx.arc(this.x, this.y, this.r+highlightOffset, 0, 2*Math.PI);
		this.ctx.stroke();
	}

	this.select = function () {
		// Set selected flags
		selectedCell = this.id;
		this.selected = true;
		// Indicate selection by filling the circle
		this.erase();
		this.redrawDendrites();
		this.draw(selectColor, true);
		this.highlight();
	}

	this.unselect = function () {
		// Set selected flags
		selectedCell = -1;
		this.selected = false;
		// Redraw the circle
		this.erase();
		this.redrawDendrites();
		this.draw(cellColor, false);
	}

	this.erase = function () {
		// Draw a white circle overtop of the current Cell, effectively erasing it
		// This does not delete the cell! Used for redrawing it (i.e. when it is selected).
		this.ctx.beginPath();
		this.ctx.fillStyle = '#fff';
		this.ctx.arc(this.x,this.y,this.r+1,0,2*Math.PI);
		this.ctx.fill();
	}

	this.eraseInner = function () {
		// Erase the inside of the cell, leaving the border
		this.ctx.fillStyle = 'rgb(255,255,255)';
		this.ctx.beginPath();
		this.ctx.arc(this.x, this.y, this.r-2, 0, 2*Math.PI);
		this.ctx.fill();
	}

	this.stimulate = function (power) {
		var oldPotential = this.potential;
		var newPotential = oldPotential + power;
		// Recursively stimulate all output cells
		if (newPotential >= this.threshold) {
			this.potential = 0;
			if (this.outputDendrites.length > 0) {
				for (var i = 0; i < this.outputDendrites.length; i++) {
					this.outputDendrites[i].destinationCell.stimulate(this.firePower);
				}
			}
		} else {
			this.potential = newPotential;		
		}
		oldPotentialRatio = oldPotential / this.threshold;
		newPotentialRatio = newPotential / this.threshold;
		this.drawPotentialWedge(true, oldPotentialRatio, newPotentialRatio);
		printMeshStateTable();
	}
}

function Dendrite(originCell = null, destinationCell, startX, startY, endX, endY, ctx) {
	this.originCell = originCell;
	this.destinationCell = destinationCell; 
	this.startX = startX;
	this.startY = startY;
	this.endX = endX;
	this.endY = endY;
	this.length = distance(startX, startY, endX, endY);
	this.midpointX = (startX + endX) / 2;
	this.midpointY = (startY + endY) / 2;
	this.ctx = ctx;

	this.draw = function (color, width) {
	    this.ctx.beginPath();
	    this.ctx.strokeStyle = color;
	    this.ctx.lineWidth = width;
		this.ctx.moveTo(this.startX, this.startY);
	    this.ctx.lineTo(this.endX, this.endY);
	    this.ctx.stroke();
	    // Draw arrow
	    this.ctx.fillStyle = color;
	    this.ctx.moveTo(this.midpointX-arrowWidth, this.midpointY-arrowWidth);
	    this.ctx.lineTo(this.midpointX, this.midpointY);
	    this.ctx.lineTo(this.midpointX-arrowWidth, this.midpointY+arrowWidth);
	    this.ctx.fill();
	}
}

function workspaceSetup() {
	// Initial setup of the workspace includes one cell and one dendrite
	var firstCell = addCell(75, 250, 20, 3, 1, false, ctx);
	firstCell.drawPotentialWedge(false, null, firstCell.potential / firstCell.threshold);
	// Create the first dendrite, which is a special case: it doesn't have an origin dendrite
	// because the first cell is stimulated by clicking the "stimulate" button.
	addDendrite(null, firstCell, 0, firstCell.y, firstCell.x-firstCell.r, firstCell.y);
	printMeshStateTable();
}

function workspaceMouseClick(event) {
	var x = event.clientX - workspace.offsetLeft + window.pageXOffset;
	var y = event.clientY - workspace.offsetTop + window.pageYOffset;
	// Are we clicking on a cell body?
	var collision = checkForCollision(x,y);

	if (drawingDendrite) {
		if (collision instanceof Cell) {
			if (collision.selected) {
				// If we're clicking on the original (selected) cell, then deselect it
				collision.unselect();
				collision.highlight();
			} else {
				// If we're clicking on a different (non-selected) cell, then create a dendrite between the selected cell and this cell
				addDendrite(Cells[selectedCell], collision, Cells[selectedCell].x, Cells[selectedCell].y, collision.x, collision.y);
				// Unselect (but don't highlight) the selected cell
				Cells[selectedCell].unselect();
			}
		} else {
			// Deselect the selected cell
			Cells[selectedCell].unselect();
		}
		drawingDendrite = false;
	} else {		
		if (collision instanceof Cell) {
			// Select the cell and enter dendrite-drawing mode
			collision.select();			
			drawingDendrite = true;
		} else if (!collision) {
			// Add a cell at the current mouse location
			var newCell = addCell(x, y, 20, 3, 1);
		}
	}
	printMeshStateTable();
}

function workspaceMove(event) {
	// Show the mouse coordinates within the canvas for reference
	var x = event.clientX - workspace.offsetLeft + window.pageXOffset;
    var y = event.clientY - workspace.offsetTop + window.pageYOffset;
    document.getElementById("mousecoords").innerHTML = "(" + x + ", " + y + ")";
	// Check for collision with a cell body. 
	var collision = checkForCollision(x,y);
	if (!collision) {
		// If there used to be a highlighted cell, then unhighlight it
		if (highlightedCell > -1) {
			cell = Cells[highlightedCell];
			cell.unhighlight();
			cell.redrawDendrites();
		}
	} else {
		// Draw a circle around the collision
		collision.highlight();
	}
}

function addDendrite(originCell = null, destinationCell, startX, startY, endX, endY) {
	// Create a new Dendrite object
	var newDen = new Dendrite(originCell, destinationCell, startX, startY, endX, endY, ctx);
	newDen.id = Dendrites.length;
	Dendrites.push(newDen);

	// Add the dendrite to its origin and destination cells
	if (originCell != null) {
		originCell.outputDendrites.push(newDen);
	}
	destinationCell.inputDendrites.push(newDen);
	newDen.draw(dendriteColor, 1);
}

function addCell(newCellX, newCellY, newRadius, newThreshold, newFirePower, initialHighlight = true) {
	// Check for collisions
	collision = checkForCollision(newCellX, newCellY);
	if (collision) {
		return false;
	}
	// Create a new cell object	
	var newCell = new Cell(newCellX, newCellY, newRadius, newThreshold, newFirePower, ctx);

	// Add the cell to the Cells array and draw it
	newCell.id = Cells.length;
	if (initialHighlight) {
		newCell.draw(cellColor, false);
		newCell.highlight();
	} else {
		newCell.draw(cellColor, false);
	}
	Cells.push(newCell);
	return newCell;
}

// DEBUG FUNCTIONS

function printMeshStateTable() {
	// Print nothing if not cells are present in the mesh
	if (Cells.length === 0) {
		return;
	}

	var html = '';
	// Setup table columns
	html += '<table class="w3-table-all w3-small"><tr><th>Cell ID</th><th>Coordinates</th><th>Potential</th><th>Threshold</th><th>Fire Power</th><th>Input Dendrites</th><th>Output Dendrites</th></tr>';
	for (var i = 0; i < Cells.length; i++) {
		html += '<tr><td>' + Cells[i].id + '</td><td>(' + Cells[i].x + ', ' + Cells[i].y + ')</td><td>' + Cells[i].potential + '</td><td>' + Cells[i].threshold + '</td><td>' + Cells[i].firePower + '</td><td>' + Cells[i].inputDendrites.length + '</td><td>' + Cells[i].outputDendrites.length + '</td></tr>';
	}
	html += '</table>';
	debug.innerHTML = html;
}

function clearCoor() {
    document.getElementById("mousecoords").innerHTML = "";
}