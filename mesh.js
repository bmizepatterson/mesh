var Cells = [];
var workspace = document.getElementById("workspace");
var debug = document.getElementById("debugspace");
var addSelector = 'cell';
var radius = 20;

// Utility functions
function distance(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow((x2-x1),2) + Math.pow((y2-y1),2));
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
}

function workspaceClick(event) {
	addMeshElement(event);
	printMeshStateTable();
}

function addMeshElement(event) {
	if (addSelector === 'cell') {
		addCell(event);
	}
}

function addCell(event) {
	// Create a new cell object
	var newCellX = event.clientX - workspace.offsetLeft + window.pageXOffset;
	var newCellY = event.clientY - workspace.offsetTop + window.pageYOffset;
	var newCell = new Cell(newCellX, newCellY, radius);

	// Check for collisions
	var collision = false;
	for (var i = 0; i < Cells.length; i++) {
		// Use the distance formula. If the distance between the two center points is less than the sum of the two radii, then a collision has occurred.
		if (distance(newCellX, newCellY, Cells[i].x, Cells[i].y) < (Cells[i].r + newCell.r)) {
			collision = true;
			break;
		}
	}

	// Add the cell to the Cells array and draw it
	if (collision == false) {		
		newCell.id = Cells.length;
		Cells.push(newCell);
		drawCell(newCell);
	}
}

function drawCell(Cell) {
	// Get canvas and drawing object
	var ctx = workspace.getContext("2d");
	// Draw a circle to represent a neuron
	ctx.beginPath();
	ctx.arc(Cell.x,Cell.y,Cell.r,0,2*Math.PI);
	ctx.stroke();
}

function clearWorkspace() {
	// Clear out Cells array
	Cells = [];
	// Erase workspace
	var ctx = workspace.getContext("2d");
	ctx.clearRect(0,0,500,500);
	// Clear debug area
	debug.innerHTML = '';
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
	if (document.getElementById("selectAddInput").classList.contains('w3-red')) {
		document.getElementById("selectAddInput").classList.remove('w3-red');
		document.getElementById("selectAddInput").classList.add('w3-black');
	}
	if (document.getElementById("selectAddOutput").classList.contains('w3-red')) {
		document.getElementById("selectAddOutput").classList.remove('w3-red');
		document.getElementById("selectAddOutput").classList.add('w3-black');
	}
}

function selectAddInput() {
	// Set current selection setting
	addSelector = 'input';
	if (document.getElementById("selectAddInput").classList.contains('w3-black')) {
		document.getElementById("selectAddInput").classList.remove('w3-black');
		document.getElementById("selectAddInput").classList.add('w3-red');
	}
	document.getElementById("tip").innerHTML = "Click and drag to add an input dendrite.";
	// Deselect the other ADD buttons
	if (document.getElementById("selectAddCell").classList.contains('w3-red')) {
		document.getElementById("selectAddCell").classList.remove('w3-red');
		document.getElementById("selectAddCell").classList.add('w3-black');
	}
	if (document.getElementById("selectAddOutput").classList.contains('w3-red')) {
		document.getElementById("selectAddOutput").classList.remove('w3-red');
		document.getElementById("selectAddOutput").classList.add('w3-black');
	}
}

function selectAddOutput() {
	// Set current selection setting
	addSelector = 'output';
	if (document.getElementById("selectAddOutput").classList.contains('w3-black')) {
		document.getElementById("selectAddOutput").classList.remove('w3-black');
		document.getElementById("selectAddOutput").classList.add('w3-red');
	}
	document.getElementById("tip").innerHTML = 'Click and drag to add an output dendrite.';
	// Deselect the other ADD buttons
	if (document.getElementById("selectAddCell").classList.contains('w3-red')) {
		document.getElementById("selectAddCell").classList.remove('w3-red');
		document.getElementById("selectAddCell").classList.add('w3-black');
	}
	if (document.getElementById("selectAddInput").classList.contains('w3-red')) {
		document.getElementById("selectAddInput").classList.remove('w3-red');
		document.getElementById("selectAddInput").classList.add('w3-black');
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
		html += '<tr><td>' + Cells[i].id + '</td><td>(' + Cells[i].x + ', ' + Cells[i].y + ')</td><td>' + Cells[i].potential + '</td><td>' + Cells[i].threshold + '</td><td>' + Cells[i].inputCells.length + '</td><td>' + Cells[i].outputCells.length + '</td></tr>';
	}
	html += '</table>';
	debug.innerHTML = html;
}

function showCoords(event) {
    var x = event.clientX - workspace.offsetLeft;
    var y = event.clientY - workspace.offsetTop;
    var coor = "(" + x + ", " + y + ")  Scrolltop: " + window.pageYOffset;
    document.getElementById("mousecoords").innerHTML = coor;
}

function clearCoor() {
    document.getElementById("mousecoords").innerHTML = "";
}