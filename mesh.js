// Global variables
var Cells = [];
var Dendrites = [];
var drawingDendrite = false;
var workspace = document.getElementById("workspace");
var ctx = workspace.getContext("2d");
var debug = document.getElementById("debugspace");
var highlightedCell = -1;
var selectedCell = -1;
var textAlign = 'center';
var font = '12px sans-serif';
var textFill = '#000';
var arrowWidth = 7;
var highlightWidth = 3;
var highlightOffset = 5;
var selectColor = '#9c27b0';
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

// Object constructors
function Cell(x, y, r, threshold, firePower) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.threshold = threshold;	// Input needed before the cell will fire
	this.potential = 0;			// Input that has been collected so far
	this.firePower = firePower;	// Output released when the cell fires
	this.inputCells = [];		// Array of cells that provide input to this cell
	this.outputCells = [];		// Array of cells to which this cell provides input
	this.inputDendrites = [];	// Array of dendrites that connect input cells to this cell
	this.outputDendrites = [];  // Array of dendrites that connect this cell to its output cells
	this.highlighted = false;
	this.selected = false;
}

function Dendrite(originCell = null, destinationCell, startX, startY, endX, endY) {
	this.originCell = originCell;
	this.destinationCell = destinationCell; 
	this.startX = startX;
	this.startY = startY;
	this.endX = endX;
	this.endY = endY;
	this.length = distance(startX, startY, endX, endY);
	this.midpointX = (startX + endX) / 2;
	this.midpointY = (startY + endY) / 2;
}

function workspaceSetup() {
	// Initial setup of the workspace includes one cell and one dendrite
	var firstCell = addCell(75, 250, 20, 100, 100, false);
    updatePotential(firstCell);
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
			// Abort if we're clicking on the selected cell again

			// Create a dendrite between the selected cell and this cell

		} else {
			// Abort the dendrite creation and deselect the selected cell
			eraseCell(Cells[selectedCell]);
			Cells[selectedCell].selected = false;
			drawCell(Cells[selectedCell], cellColor, false);
			redrawDendrites(Cells[selectedCell]);
			selectedCell = -1;
		}
		drawingDendrite = false;
	} else {		
		if (collision instanceof Cell) {
			// Select the cell and enter dendrite-drawing mode
			eraseCell(collision);
			// Set selected flag
			selectedCell = collision.id;
			collision.selected = true;
			drawCell(collision, selectColor, true);
			redrawDendrites(collision);
			highlightCell(collision);
			updatePotential(collision);
			drawingDendrite = true;
		} else if (!collision) {
			// Add a cell at the current mouse location
			var newCell = addCell(x, y, 20, 100, 100);
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
			Cells[highlightedCell].highlighted = false;
			unhighlightCell(Cells[highlightedCell]);
			redrawDendrites(Cells[highlightedCell]);
			highlightedCell = -1;
		}
	} else {
		// Set highlighted flag
		highlightedCell = collision.id;
		collision.highlighted = true;
		// Draw a circle around the collision
		highlightCell(collision);
	}
}

function addDendrite(originCell = null, destinationCell, startX, startY, endX, endY) {
	// Create a new Dendrite object
	var newDen = new Dendrite(originCell, destinationCell, startX, startY, endX, endY);
	newDen.id = Dendrites.length;
	Dendrites.push(newDen);

	// Add the dendrite to its origin and destination cells
	if (originCell != null) {
		originCell.outputDendrites[newDen.id] = newDen;
	}
	destinationCell.inputDendrites[newDen.id] = newDen;
    drawDendrite(newDen, dendriteColor, 1);
}

function drawDendrite(Dendrite, color, width) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
	ctx.moveTo(Dendrite.startX, Dendrite.startY);
    ctx.lineTo(Dendrite.endX, Dendrite.endY);
    ctx.stroke();
    // Draw arrow
    ctx.fillStyle = color;
    ctx.moveTo(Dendrite.midpointX-arrowWidth, Dendrite.midpointY-arrowWidth);
    ctx.lineTo(Dendrite.midpointX, Dendrite.midpointY);
    ctx.lineTo(Dendrite.midpointX-arrowWidth, Dendrite.midpointY+arrowWidth);
    ctx.fill();
}

function addCell(newCellX, newCellY, newRadius, newThreshold, newFirePower, initialHighlight = true) {
	// Create a new cell object	
	var newCell = new Cell(newCellX, newCellY, newRadius, newThreshold, newFirePower);
	// Check for collisions
	var collision = false;
	for (var i = 0; i < Cells.length; i++) {
		// Use the distance formula. If the distance between the two center points is less than the sum of the two radii, then a collision has occurred.
		if (distance(newCellX, newCellY, Cells[i].x, Cells[i].y) < (Cells[i].r + newCell.r + 3)) {
			collision = true;
			break;
		}
	}
	// Add the cell to the Cells array and draw it
	if (collision == false) {		
		newCell.id = Cells.length;
		if (initialHighlight == true) {
			newCell.highlighted = true;
			highlightedCell = newCell.id;
			drawCell(newCell, cellColor, false);
			highlightCell(newCell);
		} else {
			drawCell(newCell, cellColor, false);
		}
		Cells.push(newCell);
		return newCell;
	} else {
		return false;
	}
}

function highlightCell(Cell) {
	// Draw a circle around a cell to highlight it
	ctx.strokeStyle = highlightColor;
	ctx.lineWidth = highlightWidth;
	ctx.beginPath();
	ctx.arc(Cell.x, Cell.y, Cell.r+highlightOffset, 0, 2*Math.PI);
	ctx.stroke();
}

function unhighlightCell(Cell) {
	// Cover up the circle around a cell
	ctx.strokeStyle = '#fff';
	ctx.lineWidth = highlightWidth+2;
	ctx.beginPath();
	ctx.arc(Cell.x, Cell.y, Cell.r+highlightOffset, 0, 2*Math.PI);
	ctx.stroke();
}

function drawCell(Cell, color, fill) {
	ctx.beginPath();
	ctx.arc(Cell.x,Cell.y,Cell.r,0,2*Math.PI);
	if (fill) {
		ctx.fillStyle = color;
		ctx.fill();
	} else {
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.stroke();
		updatePotential(Cell);
	}
}

function eraseCell(Cell) {
	// Draw a white circle overtop of the current Cell, effectively erasing it
	// This does not delete the cell! Used for redrawing it (i.e. when it is selected).
	ctx.fillStyle = '#fff';
	ctx.beginPath();
	ctx.arc(Cell.x,Cell.y,Cell.r+1,0,2*Math.PI);
	ctx.fill();
}

function eraseCellInner(Cell) {
	// Erase the inside of the cell, leaving the border
	ctx.fillStyle = 'rgb(255,255,255)';
	ctx.beginPath();
	ctx.arc(Cell.x, Cell.y, Cell.r-2, 0, 2*Math.PI);
	ctx.fill();

}

function redrawDendrites(Cell) {
	// First erase them, then draw them again
	for (let Dendrite of Cell.inputDendrites) {
		drawDendrite(Dendrite, '#fff', 3)
		drawDendrite(Dendrite, dendriteColor, 1);
	}
	for (let Dendrite of Cell.outputDendrites) {
		drawDendrite(Dendrite, '#fff', 3)
		drawDendrite(Dendrite, dendriteColor, 1)
	}
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

function stimulate(Cell, power) {
	oldPotentialRatio = Cell.potential / Cell.threshold;
	Cell.potential = Cell.potential + power;
	updatePotential(Cell, true, oldPotentialRatio);	
	// Recursively stimulate all output cells
	if (Cell.potential >= Cell.threshold) {
		Cell.potential = 0;
		if (Cell.outputCells.length > 0) {
			for (var i = 0; i < Cell.outputCells.length; i++) {
				stimulate(Cells[i], Cell.firePower);
			}
		}
	}
	printMeshStateTable();
}

function updatePotential(Cell, animate = false, oldPotentialRatio = null) {
	eraseCellInner(Cell);
	if (Cell.potential > 0) {
		var newPotentialRatio = Cell.potential / Cell.threshold;
		drawPotentialWedge(Cell, animate, oldPotentialRatio, newPotentialRatio);
	}
}

function drawPotentialWedge(Cell, animate, oldPotentialRatio, newPotentialRatio) {	
	var color = Cell.selected ? '#fff' : wedgeColor;
	var target = 1.5*Math.PI + (newPotentialRatio*2*Math.PI); // 1.5*PI starts us at the top of the circle. Dang radians.
	if (animate == true) {
		// Instantly draw the old wedge
		var start = 1.5*Math.PI + (oldPotentialRatio*2*Math.PI);
		ctx.beginPath();
		ctx.fillStyle = color;
		ctx.moveTo(Cell.x, Cell.y);
		ctx.arc(Cell.x, Cell.y, Cell.r*0.75, 1.5*Math.PI, start);
		ctx.fill();
		// Animate the drawing of the wedge that represents accumulated potential
		var progress = start;
		var wedgeAnimation = setInterval(function() {
					if (progress < target) {
						ctx.arc(Cell.x, Cell.y, Cell.r*0.75, start, progress);
						ctx.fill();
					} else {
						// End animation if the wedge has been drawn
						clearInterval(wedgeAnimation);
						// If we have reached threshold, then complete the wedge-circle and reset after a sec
						if (newPotentialRatio === 1) {
							ctx.beginPath();
							ctx.moveTo(Cell.x, Cell.y);
							ctx.arc(Cell.x, Cell.y, Cell.r*0.75, 0, 2*Math.PI);
							ctx.fill();
						}
						setTimeout(updatePotential, 2000, Cell);
					}
					progress = progress + 3*Math.PI / 180; // Increment by 3-degree intervals
			}, 20);
	} else {
		// Draw without animating
		ctx.beginPath();
		ctx.fillStyle = color;
		ctx.moveTo(Cell.x, Cell.y);
		ctx.arc(Cell.x, Cell.y, Cell.r*0.75, 1.5*Math.PI, target);
		ctx.fill();
	}
	
}

// DEBUG FUNCTIONS

function printMeshStateTable() {
	// Print nothing if not cells are present in the mesh
	if (Cells.length === 0) {
		return;
	}

	var html = '';
	// Setup table columns
	html += '<table class="w3-table-all w3-small"><tr><th>Cell ID</th><th>Coordinates</th><th>Potential</th><th>Threshold</th><th>Input Dendrites</th><th>Output Dendrites</th></tr>';
	for (var i = 0; i < Cells.length; i++) {
		html += '<tr><td>' + Cells[i].id + '</td><td>(' + Cells[i].x + ', ' + Cells[i].y + ')</td><td>' + Cells[i].potential + '</td><td>' + Cells[i].threshold + '</td><td>' + Cells[i].inputDendrites.length + '</td><td>' + Cells[i].outputDendrites.length + '</td></tr>';
	}
	html += '</table>';
	debug.innerHTML = html;
}

function clearCoor() {
    document.getElementById("mousecoords").innerHTML = "";
}