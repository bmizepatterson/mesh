var Cells = [];
var Dendrites = [];
var workspace = document.getElementById("workspace");
var debug = document.getElementById("debugspace");
var addSelector = 'cell';
var highlightedCell = -1;
var textAlign = 'center';
var font = '12px sans-serif';
var textFill = '#000';
var arrowWidth = 7;
var selectColor = '#3f51b5';
var unselectColor = '#000';
var dendriteColor = '#777';
var wedgeColor = 'rgb(50,50,50)';

// Utility functions
function distance(x1, y1, x2, y2) {
	// Use the distance formula to calculate the distance between two points.
	return Math.ceil(Math.sqrt(Math.pow((x2-x1),2) + Math.pow((y2-y1),2)));
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
	this.highlighted = true;
	this.selected = false;
	this.lineWidth = 4;
	this.outerRadius = r + this.lineWidth;
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

function workspaceClick(event) {
	var x = event.clientX - workspace.offsetLeft + window.pageXOffset;
	var y = event.clientY - workspace.offsetTop + window.pageYOffset;
	// Are we clicking on a cell body?
	if (addSelector === 'cell') {
		// Add a cell body
		var newCellRadius = 20;
		var newCellThreshold = 100;
		var newCellFirePower = 100;
		addCell(x, y, newCellRadius, newCellThreshold, newCellFirePower);
	} else if (addSelector === 'dendrite') {
		addDendrite(event);
	}
	printMeshStateTable();
}

function workspaceMove(event) {
	// Show the mouse coordinates within the canvas for reference
	var x = event.clientX - workspace.offsetLeft + window.pageXOffset;
    var y = event.clientY - workspace.offsetTop + window.pageYOffset;
    document.getElementById("mousecoords").innerHTML = "(" + x + ", " + y + ")";
    document.getElementById("collision").innerHTML = 'highlighted cell: ' + highlightedCell;

	// Check for collision with a cell body. 
	var collision = checkForCollision(x,y);
	if (collision == false) {
		highlightedCell = -1;
		removeHighlights();
	} else {
		eraseCell(collision);
		// Set selected flag
		highlightedCell = collision.id;
		collision.highlighted = true;
		collision.lineWidth = 4;
		// Redraw cell with colored border
		drawCell(collision, selectColor);
		redrawDendrites(collision);
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
    drawDendrite(newDen);
}

function drawDendrite(Dendrite) {
	var ctx = workspace.getContext("2d");
    ctx.beginPath();
    ctx.strokeStyle = dendriteColor;
    ctx.lineWidth = 1;
	ctx.moveTo(Dendrite.startX, Dendrite.startY);
    ctx.lineTo(Dendrite.endX, Dendrite.endY);
    ctx.stroke();
    // Draw arrow
    ctx.fillStyle = dendriteColor;
    ctx.moveTo(Dendrite.midpointX-arrowWidth, Dendrite.midpointY-arrowWidth);
    ctx.lineTo(Dendrite.midpointX, Dendrite.midpointY);
    ctx.lineTo(Dendrite.midpointX-arrowWidth, Dendrite.midpointY+arrowWidth);
    ctx.fill();
}

function addCell(newCellX, newCellY, newRadius, newThreshold, newFirePower, initialSelect = true) {
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
		if (initialSelect == true) {
			newCell.lineWidth = 4;
			drawCell(newCell, selectColor);
		} else {
			newCell.lineWidth = 1;
			drawCell(newCell, unselectColor);
		}
		Cells.push(newCell);
		return newCell;
	} else {
		return false;
	}
}

function drawCell(Cell, strokeColor) {
	// Get canvas and drawing object
	var ctx = workspace.getContext("2d");

	ctx.strokeStyle = strokeColor;
	// Draw a circle to represent a neuron
	ctx.lineWidth = Cell.lineWidth;
	ctx.beginPath();
	ctx.arc(Cell.x,Cell.y,Cell.r,0,2*Math.PI);
	ctx.stroke();
	updatePotential(Cell);
}

function eraseCell(Cell) {
	// Draw a white circle overtop of the current Cell, effectively erasing it
	// This does not delete the cell! Used for redrawing it (i.e. when it is selected).
	var ctx = workspace.getContext("2d");
	ctx.strokeStyle = '#fff';
	ctx.lineWidth = Cell.lineWidth+2;
	ctx.beginPath();
	ctx.arc(Cell.x,Cell.y,Cell.r,0,2*Math.PI);
	ctx.stroke();
}

function eraseCellInner(Cell) {
	// Erase the inside of the cell, leaving the border
	var ctx = workspace.getContext('2d');
	ctx.fillStyle = 'rgb(255,255,255)';
	ctx.beginPath();
	ctx.arc(Cell.x, Cell.y, Cell.r-2, 0, 2*Math.PI);
	ctx.fill();

}

function redrawDendrites(Cell) {
	for (let Dendrite of Cell.inputDendrites) {
		drawDendrite(Dendrite);
	}
	for (let Dendrite of Cell.outputDendrites) {
		drawDendrite(Dendrite)
	}
}

function removeHighlights() {
	// Check that no objects are selected
	for (var i = 0; i < Cells.length; i++) {
		if (Cells[i].highlighted == true) {
			eraseCell(Cells[i]);
			// Set selected flag
			Cells[i].highlighted = false;
			Cells[i].lineWidth = 1;
			// Redraw the cell without the colored border
			drawCell(Cells[i], unselectColor);
			redrawDendrites(Cells[i]);
		}
	}
}

function clearWorkspace() {
	// Clear out Cells array
	Cells = [];
	Dendrites = [];
	// Erase workspace
	var ctx = workspace.getContext("2d");
	ctx.clearRect(0,0,500,500);
	// Clear debug area
	debug.innerHTML = '';
	workspaceSetup();
}

function selectAddCell() {
	// Set current selection setting
	addSelector = 'cell';
	if (document.getElementById("selectAddCell").classList.contains('w3-black')) {
		document.getElementById("selectAddCell").classList.remove('w3-black');
		document.getElementById("selectAddCell").classList.add('w3-red');
	}
	document.getElementById("tip").innerHTML = 'Click anywhere to add a cell body.';
	// Deselect the other ADD buttons
	if (document.getElementById("selectAddDendrite").classList.contains('w3-red')) {
		document.getElementById("selectAddDendrite").classList.remove('w3-red');
		document.getElementById("selectAddDendrite").classList.add('w3-black');
	}

}

function selectAddDendrite() {
	// Set current selection setting
	addSelector = 'dendrite';
	if (document.getElementById("selectAddDendrite").classList.contains('w3-black')) {
		document.getElementById("selectAddDendrite").classList.remove('w3-black');
		document.getElementById("selectAddDendrite").classList.add('w3-red');
	}
	document.getElementById("tip").innerHTML = 'To add a dendrite, click and drag from the source cell to the destination cell.';
	// Deselect the other ADD buttons
	if (document.getElementById("selectAddCell").classList.contains('w3-red')) {
		document.getElementById("selectAddCell").classList.remove('w3-red');
		document.getElementById("selectAddCell").classList.add('w3-black');
	}

}

function stimulate(Cell, power) {
	if (Cell.potential + power >= Cell.threshold) {
		fire(Cell);
		// Recursively stimulate all output cells
		if (Cell.outputCells.length > 0) {
			for (var i = 0; i < Cell.outputCells.length; i++) {
				stimulate(Cells[i], Cell.firePower);
			}
		}
		Cell.potential = 0;
	} else {
		oldPotential = Cell.potential;
		Cell.potential = Cell.potential + power;
		updatePotential(Cell, true, oldPotential);
	}
	printMeshStateTable();
}

function updatePotential(Cell, animate = false, oldPotential = null) {
	var ctx = workspace.getContext('2d');
	// Erase old potential
	eraseCellInner(Cell);
	potentialRatio = Cell.potential / Cell.threshold;

	if (potentialRatio > 0) {
		var target = 1.5*Math.PI + (potentialRatio*2*Math.PI); // 1.5*PI starts us at the top of the circle. Dang radians.
		if (animate == true) {
			// Instantly draw the current wedge
			var oldPotentialRatio = oldPotential / Cell.threshold;
			var start = 1.5*Math.PI + (oldPotentialRatio*2*Math.PI);
			ctx.beginPath();
			ctx.fillStyle = wedgeColor;
			ctx.moveTo(Cell.x, Cell.y);
			ctx.arc(Cell.x, Cell.y, Cell.r*0.75, 1.5*Math.PI, start);
			ctx.fill();
			// Animate the drawing of the wedge that represents accumulated potential
			var progress = start;
			var wedgeAnimation = setInterval(function() {
						// End animation if the wedge has been drawn
						if (progress >= target) {
							clearInterval(wedgeAnimation);
						} else {
							ctx.arc(Cell.x, Cell.y, Cell.r*0.75, start, progress);
							ctx.fill();
						}
						progress = progress + 3*Math.PI / 180; // Increment by 3-degree intervals
				}, 20);
		} else {
			// Draw without animating
			ctx.beginPath();
			ctx.fillStyle = wedgeColor;
			ctx.moveTo(Cell.x, Cell.y);
			ctx.arc(Cell.x, Cell.y, Cell.r*0.75, 1.5*Math.PI, target);
			ctx.fill();
		}
	}
}

function fire(Cell) {
	eraseCellInner(Cell);
	// Instantly draw the current wedge
	var ctx = workspace.getContext('2d');
	var oldPotentialRatio = Cell.potential / Cell.threshold;
	var start = 1.5*Math.PI + (oldPotentialRatio*2*Math.PI);
	ctx.beginPath();
	ctx.fillStyle = wedgeColor;
	ctx.moveTo(Cell.x, Cell.y);
	ctx.arc(Cell.x, Cell.y, Cell.r*0.75, 1.5*Math.PI, start);
	ctx.fill();
	var progress = start;
	var wedgeAnimation = setInterval(function() {
				// End animation if the wedge has been drawn
				if (progress > 3.5*Math.PI) {	// Target is going all the way around and back up to the top of the circle
					ctx.arc(Cell.x, Cell.y, Cell.r*0.75, 0, 2*Math.PI);
					ctx.fill();
					clearInterval(wedgeAnimation);
					setTimeout(updatePotential, 500, Cell);
				} else {
					ctx.arc(Cell.x, Cell.y, Cell.r*0.75, start, progress);
					ctx.fill();
				}
				progress = progress + 3*Math.PI / 180; // Increment by 3-degree intervals
		}, 20);
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