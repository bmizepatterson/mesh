// Global variables
var stimulationInProgress = false;	// False or the timer ID of the stimulation in progress
var Cells = [];
var Dendrites = [];
var drawingDendrite = false;
var dendriteLimit = 10;
var ctx = document.getElementById("workspace").getContext("2d");
var highlightedCell = -1;
var selectedCell = -1;
var arrowWidth = 16;
var arrowAngle = Math.PI*0.15 // Must be in radians
var highlightWidth = 3;
var highlightOffset = 4;
var cellBuffer = 30;
var selectColor = '#3f51b5';
var cellColor = '#000';
var highlightColor = '#3f51b5';
var dendriteColor = '#777';
var wedgeColor = 'rgb(50,50,50)';

// Utility functions

// Start with a white background
ctx.fillStyle = '#fff';
ctx.fillRect(0,0,500,500);
workspaceSetup();
setInterval(watch, 100);

// Add event listeners
document.getElementById("workspace").addEventListener("click", workspaceMouseClick);
document.getElementById("workspace").addEventListener("mousemove", workspaceMove);
document.getElementById("workspace").addEventListener("mouseout", workspaceMoveOut);
document.getElementById("startStimulate").addEventListener("click", clickStimulateButton);
document.getElementById("stopStimulate").addEventListener("click", stopStimulate);
document.getElementById("stepStimulate").addEventListener("click", function() { Cells[0].stimulate(1); });
document.getElementById("resetWorkspace").addEventListener("click", resetWorkspace);
document.getElementById("clearWorkspace").addEventListener("click", clearWorkspace);
document.getElementById("thresholdSetting").addEventListener("change", updateThresholdValue);
document.getElementById("thresholdSetting").addEventListener("move", updateThresholdValue);
document.getElementById("firepowerSetting").addEventListener("change", updateFirepowerValue);
document.getElementById("firepowerSetting").addEventListener("move", updateFirepowerValue);


function distance(x1, y1, x2, y2) {
	// Use the distance formula to calculate the distance between two points.
	return Math.ceil(Math.sqrt(Math.pow((x2-x1),2) + Math.pow((y2-y1),2)));
}

function watch() {
	document.getElementById("drawingDendrite").innerHTML = drawingDendrite;
	document.getElementById("highlightedCell").innerHTML = highlightedCell;
	document.getElementById("selectedCell").innerHTML = selectedCell;
	document.getElementById("stimulateCheck").innerHTML = stimulationInProgress;
}

function checkForCollision(x,y,radius = 0) {
	var collision = false;
	for (var i = 0; i < Cells.length; i++) {
		if (distance(x, y, Cells[i].x, Cells[i].y) <= Cells[i].r + radius) {
			// If the distance between the mouse and this cell's center is less than this cell's radius, then we have a collision.
			collision = Cells[i];
			break;
		}
	}
	return collision;
}

function displayTip(text, time = 5000) {
	document.getElementById("tip").innerHTML = text;
	setTimeout(function () { document.getElementById("tip").innerHTML = '&nbsp;'; } , time);
}

function TimerCollection() {
	this.wedgeAnimation = 0;
	this.fireAnimation = 0;
	this.stimulateChildDelay = 0;
}

// Object constructors
function Cell(x, y, r, threshold, firePower, ctx) {
	this.x = x;
	this.y = y;
	this.r = r;
	this.threshold = threshold;	// Input needed before the cell will fire
	this.potential = 0;			// Input that has been collected so far
	this.firePower = firePower;	// Output released when the cell fires
	this.inputDendrites = [];	// Array of dendrites that connect input cells to this cell
	this.outputDendrites = [];  // Array of dendrites that connect this cell to its output cells
	this.highlighted = false;
	this.selected = false;
	this.ctx = ctx;				// The drawing context of the HTML canvas
	this.TimerCollection = new TimerCollection();	// An array of any and all animation timers associated with this cell

	this.draw = function () {
		var color = this.selected ? selectColor : cellColor;
		var fill = this.selected ? true : false;

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
			this.drawPotentialWedge(false, 0, this.potential / this.threshold);
		}
	}

	this.drawPotentialWedge = function (animate, oldPotentialRatio = null, newPotentialRatio, stimulateChildren = false) {	
		if (animate && oldPotentialRatio == null) {
			console.log('oldPotentialRatio must be passed to Cell::drawPotentialWedge() if animating.');
		}
		var fillStyle = this.selected ? '#fff' : wedgeColor;
		var target = 1.5*Math.PI + (newPotentialRatio*2*Math.PI); // 1.5*PI starts us at the top of the circle. Dang radians.
		if (animate == true) {
			var start = 1.5*Math.PI + (oldPotentialRatio*2*Math.PI);
			// Instantly draw the old wedge, if any
			if (oldPotentialRatio > 0) {
				this.ctx.beginPath();
				this.ctx.fillStyle = fillStyle;
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
							cell.ctx.fillStyle = fillStyle;
							cell.ctx.moveTo(cell.x, cell.y);
							cell.ctx.arc(cell.x, cell.y, cell.r*0.75, start, progress);
							cell.ctx.fill();
						} else {
							// If the cell has reached its threshold, then it fires
							if (newPotentialRatio === 1) {
								cell.fire(stimulateChildren);
							}
							clearInterval(wedgeAnimation);	// End animation
							cell.TimerCollection.wedgeAnimation = 0;
							// Take a snapshot of the cell and update the cell info table
							var cellSnapshot = cell;
							printMeshStateTable(cellSnapshot);
						}
						progress = progress + 10*Math.PI / 180; // Increment by 10-degree intervals (Screw radians!)
				}, 10);
			this.TimerCollection.wedgeAnimation = wedgeAnimation;
		} else {
			// Draw without animating
			this.ctx.beginPath();
			this.ctx.fillStyle = fillStyle;
			this.ctx.moveTo(this.x, this.y);
			this.ctx.arc(this.x, this.y, this.r*0.75, 1.5*Math.PI, target);
			this.ctx.fill();
		}		
	}

	this.fire = function (stimulateChildren) {
		// Complete the wedge-circle, stimulate children, and reset after a sec
		this.ctx.fillStyle = '#ffc107';
		this.ctx.beginPath();
		this.ctx.moveTo(this.x, this.y);
		this.ctx.arc(this.x, this.y, this.r*0.8, 0, 2*Math.PI);
		this.ctx.fill();
		var parentCell = this;
		var fn;
		if (stimulateChildren) {
			fn = function () {
				parentCell.TimerCollection.fireAnimation = 0;
				parentCell.eraseInner(); 
				parentCell.drawPotentialWedge(true, 0, parentCell.potential / parentCell.threshold);
				parentCell.stimulateChildren();
			};
		} else {
			fn = function () {
				parentCell.TimerCollection.fireAnimation = 0;
				parentCell.eraseInner(); 
				parentCell.drawPotentialWedge(true, 0, parentCell.potential / parentCell.threshold);
			};
		}
		var fireAnimation = window.setTimeout(fn, 250);
		this.TimerCollection.fireAnimation = fireAnimation;
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
		// Highlight this row on the cell table
		var row = document.getElementById("cellRow"+this.id);
		for (var i = 0; i < row.children.length; i++) {
			row.children[i].style.backgroundColor = "#ffffcc";
		}
		// Display the cell info below the canvas
		document.getElementById("cellInfo").innerHTML = "Current Potential: " + this.potential + "; Threshold: " + this.threshold + "; Power: "+this.firePower;
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
		this.redrawDendrites();
		// Unhighlight this row on the cell table
		var row = document.getElementById("cellRow"+this.id);
		for (var i = 0; i < row.children.length; i++) {
			row.children[i].style.backgroundColor = "initial";
		}
		document.getElementById("cellInfo").innerHTML = "";
	}

	this.select = function () {
		// Set selected flags
		selectedCell = this.id;
		this.selected = true;
		// Indicate selection by filling the circle
		this.erase();
		this.redrawDendrites();
		this.draw();
		this.highlight();
	}

	this.unselect = function () {
		// Set selected flags
		selectedCell = -1;
		this.selected = false;
		// Redraw the circle
		this.erase();
		this.redrawDendrites();
		this.draw();
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
		this.ctx.fillStyle = '#fff';
		this.ctx.beginPath();
		this.ctx.arc(this.x, this.y, this.r-1, 0, 2*Math.PI);
		this.ctx.fill();
	}

	this.stimulate = function (power) {
		// If we're in the middle of firing, then ignore stimulation
		if (this.TimerCollection.fireAnimation) {
			return;
		}

		var oldPotential = this.potential;
		var newPotential = oldPotential + power;
		oldPotentialRatio = oldPotential / this.threshold;
		newPotentialRatio = newPotential / this.threshold;
		this.potential = newPotential;
		// Take a snapshot of the cell and update the cell table with it
		var cellSnapshot = this;	
		printMeshStateTable(cellSnapshot);
		if (newPotential >= this.threshold) {
			this.potential = 0;			
		}
		this.drawPotentialWedge(true, oldPotentialRatio, newPotentialRatio, true);
	}

	this.stimulateChildren = function () {
		if (this.outputDendrites.length > 0) {
			var power = this.firePower;
			for (let i = 0; i < this.outputDendrites.length; i++) {
				// Delay for a time proportional to the length of the dendrite
				let cell = this.outputDendrites[i].destinationCell;
				var delay = this.outputDendrites[i].length;
				var stimulateChildDelay = setTimeout(function() { 
						cell.TimerCollection.stimulateChildDelay = 0;
						cell.stimulate(power);
					} , delay);
				this.TimerCollection.stimulateChildDelay = stimulateChildDelay;
			}
		}
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
	this.arrowCoords = null;

	this.getArrowCoords = function() {
		// Calculate (if needed) the coordinates for each side of the arrow
		// Uses global arrowWidth variable
		// Returns the coordinates in an array of four elements: x1, y1, x2, y2
		if (this.arrowCoords == null) {
			if (arrowWidth === 0) {
				console.log('Unable to calculate arrow coordinates of dendrite #'+this.id+'. (Arrow width cannot be zero.)');
				return false;
			}
			// If the destination cell is on the right, then the arrow needs to point to the right
			var x1, y1, x2, y2;
			if (this.endX > this.startX) {
				x1 = Math.round(this.midpointX - Math.cos(arrowAngle - Math.asin(2*(this.midpointY-this.destinationCell.y)/this.length))*arrowWidth/(2*Math.sin(arrowAngle)));
				y1 = Math.round(this.midpointY - Math.sin(arrowAngle - Math.asin(2*(this.midpointY-this.destinationCell.y)/this.length))*arrowWidth/(2*Math.sin(arrowAngle)));
				x2 = Math.round(this.midpointX - Math.cos(arrowAngle + Math.asin(2*(this.midpointY-this.destinationCell.y)/this.length))*arrowWidth/(2*Math.sin(arrowAngle)));
				y2 = Math.round(this.midpointY + Math.sin(arrowAngle + Math.asin(2*(this.midpointY-this.destinationCell.y)/this.length))*arrowWidth/(2*Math.sin(arrowAngle)));
			} else if (this.endX < this.startX) {
				x1 = Math.round(this.midpointX + Math.cos(arrowAngle + Math.asin(2*(this.midpointY-this.destinationCell.y)/this.length))*arrowWidth/(2*Math.sin(arrowAngle)));
				y1 = Math.round(this.midpointY + Math.sin(arrowAngle + Math.asin(2*(this.midpointY-this.destinationCell.y)/this.length))*arrowWidth/(2*Math.sin(arrowAngle)));
				x2 = Math.round(this.midpointX + Math.cos(arrowAngle - Math.asin(2*(this.midpointY-this.destinationCell.y)/this.length))*arrowWidth/(2*Math.sin(arrowAngle)));
				y2 = Math.round(this.midpointY - Math.sin(arrowAngle - Math.asin(2*(this.midpointY-this.destinationCell.y)/this.length))*arrowWidth/(2*Math.sin(arrowAngle)));
			} else {
				// This dendrite is vertical. Should it point up or down?
				x1 = Math.round(this.midpointX - arrowWidth/2);
				x2 = Math.round(this.midpointX + arrowWidth/2);
				// Y values are the same if it's pointing up or down
				if (this.startY < this.endY) {
					// Point up
					y1 = y2 = Math.round(this.midpointY - arrowWidth/(2*Math.tan(arrowAngle)));
				} else {
					// Point down
					y1 = y2 = Math.round(this.midpointY + arrowWidth/(2*Math.tan(arrowAngle)));
				}
			}
			this.arrowCoords = [x1,y1,x2,y2];
		}
		return this.arrowCoords;
	}

	this.draw = function (color, width, redrawCells = true) {
	    this.ctx.beginPath();
	    this.ctx.strokeStyle = color;
	    this.ctx.lineWidth = width;
		this.ctx.moveTo(this.startX, this.startY);
	    this.ctx.lineTo(this.endX, this.endY);
	    this.ctx.stroke();
	    // Draw arrow
	    if (this.getArrowCoords()) {
	    	this.ctx.beginPath();
	    	this.ctx.fillStyle = color;
	    	this.ctx.moveTo(this.arrowCoords[0], this.arrowCoords[1]);
	    	this.ctx.lineTo(Math.round(this.midpointX), Math.round(this.midpointY));
	    	this.ctx.lineTo(this.arrowCoords[2], this.arrowCoords[3]);
	    	this.ctx.fill();
	    }
	    if (redrawCells) {
		    if (this.originCell != null) {
		    	this.originCell.erase();
		    	this.originCell.draw();
		    }
	    	this.destinationCell.erase();
	    	this.destinationCell.draw();
		}
	}
}

function clearWorkspace() {
	// Stop all stimulation if necessary
	resetWorkspace();
	// Clear out arrays
	Cells = [];
	Dendrites = [];
	// Erase workspace
	ctx.clearRect(0,0,500,500);
	ctx.fillStyle = '#fff';
	ctx.fillRect(0,0,500,500);
	workspaceSetup();
}

function resetWorkspace() {
	// Stop all stimulation if necessary
	stopStimulate();
	// Halt all ongoing wedge animations and reset all cell potentials to zero
	for (let i = 0; i < Cells.length; i++) {
		// Clear currently running timers
		if (Cells[i].TimerCollection.wedgeAnimation) {
			clearInterval(Cells[i].TimerCollection.wedgeAnimation);
		}
		if (Cells[i].TimerCollection.fireAnimation) {
			clearInterval(Cells[i].TimerCollection.fireAnimation);
		}
		if (Cells[i].TimerCollection.stimulateChildDelay) {
			clearInterval(Cells[i].TimerCollection.stimulateChildDelay);
		}
		Cells[i].potential = 0;
		Cells[i].eraseInner();
	}
	printMeshStateTable();
}

function workspaceSetup() {
	// Initial setup of the workspace includes one cell and one dendrite
	var firstCell = addCell(75, 250, 20, 1, 1, false, ctx);
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
				if (Dendrites.length < dendriteLimit) {
					// If we're clicking on a different (non-selected) cell, then create a dendrite between the selected cell and this cell
					addDendrite(Cells[selectedCell], collision, Cells[selectedCell].x, Cells[selectedCell].y, collision.x, collision.y);
				} else {
					displayTip('You\'ve added the maximum number of connections.', 5000);
				}
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
		} else {
			// If there's room, add a cell at the current mouse location
			var newRadius = 20;
			if (x > 500-newRadius-highlightWidth-highlightOffset || y > 500-newRadius-highlightWidth-highlightOffset || checkForCollision(x,y,newRadius+cellBuffer)) {
				displayTip("There is not enough room to place a cell here.", 5000);
			} else {
				var threshold = parseInt(document.getElementById("thresholdSetting").value);
				var firepower = parseInt(document.getElementById("firepowerSetting").value);
				addCell(x, y, newRadius, threshold, firepower);
			}
		}
	}
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
		}
	} else {
		// Draw a circle around the collision
		collision.highlight();
	}
}

function workspaceMoveOut(event) {
	document.getElementById("mousecoords").innerHTML = "";
	// Make sure no cells are highlighted
	if (highlightedCell > -1) {
		cell = Cells[highlightedCell];
		cell.unhighlight();
		cell.redrawDendrites();
	}
}

function clickStimulateButton() {
	document.getElementById("stopStimulate").style.display = "block";
	document.getElementById("startStimulate").style.display = "none";
	document.getElementById("stepStimulate").disabled = true;
	Cells[0].stimulate(1);
	stimulationInProgress = setInterval(function() { Cells[0].stimulate(1); }, 1000);
}

function stopStimulate() {
	if (stimulationInProgress) {
		clearInterval(stimulationInProgress);
		stimulationInProgress = false;
		document.getElementById("stopStimulate").style.display = "none";
		document.getElementById("startStimulate").style.display = "block";
		document.getElementById("stepStimulate").disabled = false;
	}
}

function updateThresholdValue() {
	document.getElementById("thresholdValue").innerHTML = document.getElementById("thresholdSetting").value;
}

function updateFirepowerValue() {
	document.getElementById("firepowerValue").innerHTML = document.getElementById("firepowerSetting").value;
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
	printMeshStateTable();
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
	newCell.draw();
	Cells.push(newCell);
	printMeshStateTable(newCell);
	if (initialHighlight) {
		newCell.highlight();
	}
	return newCell;
}
 
function printMeshStateTable(cell = null) {
	// Print nothing if no cells are present in the mesh
	if (!Cells.length) {
		return;
	}
	var tbody = document.getElementById("cellInfoTable").getElementsByTagName('tbody')[0];
	if (cell !== null) {
		// If the row exists, then update it; otherwise add it
		if (tbody.rows.length > cell.id) {
			// Find the row for this cell and update it
			var cellRow = tbody.rows[cell.id];
			cellRow.cells[0].innerHTML = cell.id;
			cellRow.cells[1].innerHTML = "("+cell.x+", "+cell.y+")";
			cellRow.cells[2].innerHTML = cell.potential;
			cellRow.cells[3].innerHTML = cell.threshold;
			cellRow.cells[4].innerHTML = cell.firePower;
			cellRow.cells[5].innerHTML = cell.inputDendrites.length;
			cellRow.cells[6].innerHTML = cell.outputDendrites.length;
		} else {
			var row = tbody.insertRow(cell.id);
			row.id = "cellRow"+cell.id;
			row.addEventListener("mouseover", function() { cell.highlight(); });
			row.addEventListener("mouseout", function() { cell.unhighlight(); });
			row.insertCell(0).innerHTML = cell.id+1;
			row.insertCell(1).innerHTML = "("+cell.x+", "+cell.y+")";
			row.insertCell(2).innerHTML = cell.potential;
			row.insertCell(3).innerHTML = cell.threshold;
			row.insertCell(4).innerHTML = cell.firePower;
			row.insertCell(5).innerHTML = cell.inputDendrites.length;
			row.insertCell(6).innerHTML = cell.outputDendrites.length;
		}
	} else {
		// Reprint the entire table. Delete the old, stale rows in the table body
		var rowCount = tbody.rows.length;	// Copy this so it doesn't change as you loop through and delete the rows one at a time
		for (var j = 0; j < rowCount; j++) {
			// Careful. Must pass 0 for each loop, because as one row is deleted, the others move up.
			tbody.deleteRow(0);
		}

		for (let i = 0; i < Cells.length; i++) {
			var row = tbody.insertRow(i);
			row.id = "cellRow"+i;
			let cell = Cells[i];
			row.addEventListener("mouseover", function() { cell.highlight(); });
			row.addEventListener("mouseout", function() { cell.unhighlight(); });
			row.insertCell(0).innerHTML = Cells[i].id+1;
			row.insertCell(1).innerHTML = "("+Cells[i].x+", "+Cells[i].y+")";
			row.insertCell(2).innerHTML = Cells[i].potential;
			row.insertCell(3).innerHTML = Cells[i].threshold;
			row.insertCell(4).innerHTML = Cells[i].firePower;
			row.insertCell(5).innerHTML = Cells[i].inputDendrites.length;
			row.insertCell(6).innerHTML = Cells[i].outputDendrites.length;
		}
	}
}