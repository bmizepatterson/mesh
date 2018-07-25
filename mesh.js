var Cells = [];
var workspace = document.getElementById("workspace");
var debug = document.getElementById("debugspace");

function Cell(x, y, r) {
	this.x = x;
	this.y = y;
	this.r = r;
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

// DEBUG FUNCTIONS

function print_cell(cell) {
	debug.innerHTML += "<p>Cell " + cell.id + ": (" + cell.x + ", " + cell.y + ")</p>";
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