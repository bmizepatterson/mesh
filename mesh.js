var Cells = [];
var workspace = document.getElementById("workspace");
var debug = document.getElementById("debugspace");
var addSelector = 'cell';

function Cell(x, y, r) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.threshold = 100;
	this.potential = 0;
	this.inputCells = [];
	this.outputCells = [];
}

function addMeshElement(event) {
	if (addSelector === 'cell') {
		addCell(event);
	}
}

function addCell(event) {
	var newCell = new Cell(event.clientX - workspace.offsetLeft, event.clientY - workspace.offsetTop, 20);
	newCell.id = Cells.length;
	// Add it to the list of Cells
	Cells.push(newCell);
	// Draw it
	drawCell(newCell);
	print_cell(newCell);
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

function print_cell(cell) {
	debug.innerHTML += "<p>Cell " + cell.id + " (" + cell.x + ", " + cell.y + "): " + cell.potential + "/" + cell.threshold + " </p>";
}

function showCoords(event) {
    var x = event.clientX - workspace.offsetLeft;
    var y = event.clientY - workspace.offsetTop;
    var coor = "(" + x + ", " + y + ")";
    document.getElementById("mousecoords").innerHTML = coor;
}

function clearCoor() {
    document.getElementById("mousecoords").innerHTML = "";
}