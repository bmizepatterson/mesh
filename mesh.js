var Cells = [];
var Dendrites = [];
var workspace = document.getElementById("workspace");
var debug = document.getElementById("debugspace");
var addSelector = 'cell';
var radius = 20;
var highlightedCell = -1;
var textAlign = 'center';
var font = '12px sans-serif';

// Utility functions
function distance(x1, y1, x2, y2) {
	// Use the distance formula to calculate the distance between two points.
	return Math.ceil(Math.sqrt(Math.pow((x2-x1),2) + Math.pow((y2-y1),2)));
}

// Object constructors
function Cell(x, y, r) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.threshold = 100;
	this.potential = 0;
	this.inputCells = [];
	this.outputCells = [];
	this.highlighted = true;
	this.selected = false;
	this.lineWidth = 4;
	this.outerRadius = r + this.lineWidth;
}

function Dendrite(originCell = null, destinationCell) {
	this.originCell = originCell;
	this.destinationCell = destinationCell; 
}

function workspaceSetup() {
	// Initial setup of the workspace includes one cell and one dendrite
	var firstCell = new Cell(75, 250, radius);
	firstCell.id = 0;
	firstCell.highlighted = false;
	firstCell.lineWidth = 1;
	Cells.push(firstCell);

	var firstDendrite = new Dendrite(null, 0);
	firstDendrite.id = 0;
	Dendrites.push(firstDendrite);
	var ctx = workspace.getContext("2d");
	ctx.beginPath();
	ctx.moveTo(0, 250);
    ctx.lineTo(55, 250);
    ctx.arc(firstCell.x,firstCell.y,firstCell.r,Math.PI,4*Math.PI);
    ctx.stroke();

    ctx.textAlign = textAlign;
    ctx.font = font;
    ctx.fillText(firstCell.potential, 75, 255);

	printMeshStateTable();
}

function workspaceClick(event) {
	if (addSelector === 'cell') {
		var newCellX = event.clientX - workspace.offsetLeft + window.pageXOffset;
		var newCellY = event.clientY - workspace.offsetTop + window.pageYOffset;
		addCell(newCellX, newCellY);
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
	// Ignore collisions with the first Cell
	var collision = false;
	for (var i = 0; i < Cells.length; i++) {
		if (distance(x, y, Cells[i].x, Cells[i].y) <= Cells[i].r) {
			// If the distance between the mouse and this cell's center is less than this cell's radius, then we have a collision.
			collision = true;
			eraseCell(Cells[i]);
			// Set selected flag
			highlightedCell = i;
			Cells[i].highlighted = true;
			Cells[i].lineWidth = 4;
			// Redraw cell with colored border
			drawCell(Cells[i], '#3f51b5');
			break;
		}
	}

	if (collision == false) {
		highlightedCell = -1;
		removeHighlights();
	}
}

function drawDendrite(Dendrite) {
	// Get canvas and drawing object
	var ctx = workspace.getContext("2d");

	// Determine starting position

	// Determine ending position

	// Draw a line to represent a dendrite

}

function addCell(newCellX, newCellY) {
	// Create a new cell object	
	var newCell = new Cell(newCellX, newCellY, radius);

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
		Cells.push(newCell);
		drawCell(newCell, '#3f51b5');
		return newCell;
	} else {
		return false;
	}
}

function drawCell(Cell, color, fill = false) {
	// Get canvas and drawing object
	var ctx = workspace.getContext("2d");

	ctx.strokeStyle = color;
	// Draw a circle to represent a neuron
	ctx.lineWidth = Cell.lineWidth;
	ctx.beginPath();
	ctx.arc(Cell.x,Cell.y,Cell.r,0,2*Math.PI);
	ctx.stroke();
	if (fill == true) {
		ctx.fillStyle = color;
		ctx.fill();
	}
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

function removeHighlights() {
	// Check that no objects are selected
	for (var i = 0; i < Cells.length; i++) {
		if (Cells[i].highlighted == true) {
			eraseCell(Cells[i]);
			// Set selected flag
			Cells[i].highlighted = false;
			Cells[i].lineWidth = 1;
			// Redraw the cell without the colored border
			drawCell(Cells[i], '#000');
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
				stimulate(Cells[i], power);
			}
		}
		Cell.potential = 0;
	} else {
		Cell.potential = Cell.potential + power;
	}
	updatePotential(Cell);
	printMeshStateTable();
}

function updatePotential(Cell) {
	var ctx = workspace.getContext('2d');
	// Erase old potential
	ctx.clearRect(Cell.x-11, Cell.y-10, 22, 20);

	// Draw new potential
	ctx.textAlign = textAlign;
    ctx.font = font;
    ctx.fillText(Cell.potential, Cell.x, Cell.y+5);
}

function fire(Cell) {
	// Animate a cell firing

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
		html += '<tr><td>' + Cells[i].id + '</td><td>(' + Cells[i].x + ', ' + Cells[i].y + ')</td><td>' + Cells[i].potential + '</td><td>' + Cells[i].threshold + '</td><td>' + Cells[i].inputCells.length + '</td><td>' + Cells[i].outputCells.length + '</td></tr>';
	}
	html += '</table>';
	debug.innerHTML = html;
}

function clearCoor() {
    document.getElementById("mousecoords").innerHTML = "";
}