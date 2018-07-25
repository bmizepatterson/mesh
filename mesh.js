var Cells;

function Cell(x, y, r) {
	this.x = x;
	this.y = y;
	this.r = r;
}

function addCell() {
	// Find a new spot
	var newCell = new Cell(100, 200, 20);
	newCell.id = Cells.length;
	// Add it to the list of Cells
	Cells[] = newCell;
	// Draw it
	drawCell(newCell);
	document.getElementById("debugspace").innerHTML = Cells;
}


function drawCell(Cell) {

	// Get canvas and drawing object
	var canvas = document.getElementById("workspace");
	var ctx = canvas.getContext("2d");
	
	// Draw a circle to represent a neuron
	ctx.beginPath();
	ctx.arc(Cell.x,Cell.y,Cell.r,0,2*Math.PI);
	ctx.stroke();

}