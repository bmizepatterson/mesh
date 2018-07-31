var				   canvas = document.getElementById('workspace'),
					  ctx = canvas.getContext("2d"),
	stimulationInProgress = false,	// False or the timer ID of the stimulation in progress
		  drawingDendrite = false,
 		  activeCellCount = 0,
		  firingCellCount = 0,
		  highlightedCell = -1,
	  highlightedDendrite = -1,
			 selectedCell = -1,
					Cells = [],
				Dendrites = [],
			dendriteLimit = 30,
			   arrowWidth = 10,
			   arrowAngle = Math.PI*0.15, // Must be in radians
		   highlightWidth = 2,
		  highlightOffset = 5,
		  interCellBuffer = 30,
		  	  canvasWidth = 500,
		     canvasHeight = 500,
			  selectColor = '#3f51b5',
				cellColor = '#000',
		   highlightColor = '#3f51b5',
			dendriteColor = '#777',
			   wedgeColor = 'rgb(50,50,50)',
		  backgroundColor = '#fff',
		  		fireColor = '#ffc107',
			   curveWidth = 20,
				fireCount = 0,
		 stimulationCount = 0;

// Object constructors
function Cell(x, y, r, threshold, firePower, refactoryPeriod) {
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
	this.firing = false;		// Whether the cell is currently firing.
	this.active = false;		// A cell is active if it is currently being stimulated
	this.refactoryPeriod = refactoryPeriod;
	this.currentWedgeAngle = -Math.PI/2;
	this.locked = false;		// If the cell is locked, then it can't be stimulated.
	this.deleted = false;

	this.draw = function() {
		var lineColor = this.selected ? selectColor : cellColor;
		var fillColor = this.selected ? selectColor : backgroundColor;
		ctx.beginPath();
		ctx.arc(this.x,this.y,this.r,0,2*Math.PI);
		ctx.fillStyle = fillColor;
		ctx.fill();
		ctx.strokeStyle = lineColor;
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.closePath();
		if (this.highlighted) {
			ctx.beginPath();
			ctx.strokeStyle = highlightColor;
			ctx.lineWidth = highlightWidth;
			ctx.arc(this.x, this.y, this.r+highlightOffset, 0, 2*Math.PI);
			ctx.stroke();
			ctx.closePath();
		}
		if (this.firing) {
			ctx.beginPath();
			ctx.fillStyle = fireColor;
			ctx.arc(this.x, this.y, this.r * 0.75, 0, 2 * Math.PI);
			ctx.fill();
			ctx.closePath();
		} else if (this.potential > 0) {
			var targetAngle = this.potential / this.threshold * 2 * Math.PI - Math.PI/2;	// -PI/2 starts us at the top of the circle. Dang radians.
			ctx.beginPath();
			ctx.fillStyle = this.selected ? backgroundColor : wedgeColor;
			ctx.moveTo(this.x, this.y);
			ctx.arc(this.x, this.y, this.r * 0.75, -Math.PI/2, this.currentWedgeAngle);
			ctx.fill();
			ctx.closePath();
			if (this.currentWedgeAngle < targetAngle && !this.locked) {
				this.currentWedgeAngle = this.currentWedgeAngle + (10 * Math.PI / 180); // Increment by 10-degree intervals (Screw radians!)
			} 
			if (this.potential === this.threshold && this.currentWedgeAngle >= 1.5 * Math.PI) {
				this.fire();
				this.currentWedgeAngle = -Math.PI/2;
			}
			if (this.currentWedgeAngle >= targetAngle) {
				this.active = false;
			}
			updateCellInfoTable(this.id, 'status', this.getStatus());
		}
	}

	this.fire = function () {
		// If we're already in the middle of firing (including the refactory period), then do nothing
		if (this.firing) {
			return;
		}
		// Complete the wedge-circle, stimulate children, and reset after a refactory period
		this.firing = true;
		fireCount++;
		updateStatisticsTable();
		updateCellInfoTable(this.id, 'status', this.getStatus());

		var parentCell = this;
		var fn = function () {
			parentCell.potential = 0;
			parentCell.firing = false;
			parentCell.active = false;
			updateCellInfoTable(parentCell.id, 'potential', parentCell.potential);			
			updateCellInfoTable(parentCell.id, 'status', parentCell.getStatus());
			if (parentCell.outputDendrites.length > 0) {
				var power = parentCell.firePower;
				for (let i = 0; i < parentCell.outputDendrites.length; i++) {
					if (parentCell.outputDendrites[i].deleted) continue;
					// Delay for a time proportional to the length of the dendrite
					let childCell = parentCell.outputDendrites[i].destinationCell;
					let delay = parentCell.outputDendrites[i].length;
					window.setTimeout( function() { childCell.stimulate(power); } , delay);
				}
			}	
		};
		window.setTimeout(fn, parentCell.refactoryPeriod);
	}

	this.highlight = function () {
		highlightedCell = this.id;
		this.highlighted = true;
		// Highlight all output dendrites as well
		for (let i = 0; i < this.outputDendrites.length; i++) {
			if (this.outputDendrites[i].deleted) continue;
			this.outputDendrites[i].highlight();
		}
		document.getElementById("cellInfo").innerHTML = "Current Potential: " + this.potential + "; Threshold: " + this.threshold + "; Power: "+this.firePower;
		// Highlight this cell's row in the cell info table
		var row = document.getElementById('cellRow'+this.id);
		var borderStyle = '1px solid '+highlightColor;
		for (let i = 0; i < row.children.length; i++) {
			if (i === 0) {
				row.children[i].style.borderLeft = borderStyle;
			} else if (i == row.children.length-1) {
				row.children[i].style.borderRight = borderStyle;
			}
			row.children[i].style.borderTop = row.children[i].style.borderBottom = borderStyle;
		}
	}

	this.unhighlight = function () {
		highlightedCell = -1;
		this.highlighted = false;
		// Unhighlight all output dendrites as well
		for (let i = 0; i < this.outputDendrites.length; i++) {
			if (this.outputDendrites[i].deleted) continue;
			this.outputDendrites[i].unhighlight();
		}
		// Unhighlight this cell's row in the cell info table
		document.getElementById("cellInfo").innerHTML = "";
		var row = document.getElementById('cellRow'+this.id);
		for (let i = 0; i < row.children.length; i++) {
			row.children[i].style.border = 'initial';			
		}
	}

	this.toggleSelect = function () {
		if (this.selected) {
			this.unselect();
		} else {
			this.select();
		}
	}

	this.select = function () {
		// Unselect all other cells
		for (let i = 0; i < Cells.length; i++) {
			if (Cells[i].deleted) continue;
			Cells[i].unselect();
		}
		// Set selected flags
		selectedCell = this.id;
		this.selected = true;
		drawingDendrite = true;
		var row = document.getElementById('cellRow'+this.id);
		for (let i = 0; i < row.children.length; i++) {
			row.children[i].style.color = backgroundColor;
			row.children[i].style.backgroundColor = selectColor;
		}
		if (this.id !== 0) {
			// Don't show the delete button for the first cell
			document.getElementById("contextMenu").style.display="block";
			document.getElementById("contextMenu").classList.add('w3-animate-opacity');
		}
	}

	this.unselect = function() {
		// Set selected flags
		selectedCell = -1;
		this.selected = false;
		drawingDendrite = false;
		var row = document.getElementById('cellRow'+this.id);
		for (let i = 0; i < row.children.length; i++) {
			row.children[i].style.color = 'initial';
			row.children[i].style.backgroundColor = 'initial';
		}
		document.getElementById("contextMenu").style.display="none";
	}

	this.stimulate = function(power) {
		if (this.locked) {
			return;
		}
		this.active = true;
		var newPotential = this.potential + power;
		newPotential = (newPotential > this.threshold) ? this.threshold : newPotential;
		this.potential = newPotential;
		stimulationCount++;
		updateStatisticsTable();
  		updateCellInfoTable(this.id, 'potential', this.potential);
  		updateCellInfoTable(this.id, 'status', this.getStatus());
	}

	this.reset = function() {
		this.locked = true;
		this.firing = false;
		this.potential = 0;
		this.currentWedgeAngle = -Math.PI/2;
		this.unselect();
		this.unhighlight();
		var cell = this;
		window.setTimeout(function() { cell.locked = false; }, 1000);
	}

	this.delete = function() {
		this.deleted = true;
		// Delete all input/output dendrites
		for (var i = 0; i < this.inputDendrites.length; i++) {
			this.inputDendrites[i].delete();
		}
		for (var i = 0; i < this.outputDendrites.length; i++) {
			this.outputDendrites[i].delete();
		}
		updateStatisticsTable();
		updateCellInfoTable();
	}

	this.getStatus = function() {
		if (this.firing) {
			return "Firing";
		} else if (this.active) {
			return "Active";
		} else {
			return "Inactive";
		}		
	}
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
	this.arrowCoords = null;
	this.controlPoint = null;
	this.arc = null;
	this.deleted = false;
	this.highlighted = false;

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

	this.getControlPoint = function() {
		// Calculate (if needed) the coordinates for the control point needed for drawing the arc between two cells
		// Uses global curveWidth variable
		// Returns the coordinates in an array [x, y].
		if (this.controlPoint == null) {
			var x, y;
			if (this.startY < this.endY) {
				x = Math.round(this.midpointX + (curveWidth * Math.sin(Math.PI/2 - Math.asin(2*(this.startX-this.midpointX)/this.length))));
				y = Math.round(this.midpointY + (curveWidth * Math.cos(Math.PI/2 - Math.asin(2*(this.startX-this.midpointX)/this.length))));
			} else {
				x = Math.round(this.midpointX - (curveWidth * Math.sin(Math.PI/2 - Math.asin(2*(this.startX-this.midpointX)/this.length))));
				y = Math.round(this.midpointY + (curveWidth * Math.cos(Math.PI/2 - Math.asin(2*(this.startX-this.midpointX)/this.length))));
			}
			document.getElementById("controlPoint").innerHTML = '(' + x + ', ' + y + ')';
			this.controlPoint = [x, y];
		}
		return this.controlPoint;
	}

	this.getArc = function() {
		// Calculate (if needed) the coordinates and radius of the arc to draw between two cells
		// Returns the coordinates in an array [x, y, radius].
		if (this.arc == null) {
			// Define vertices of triangle ABC with circumcenter P
			var Ax, Ay, Bx, By, Cx, Cy, Px, Py, Pr;
			var Ax2, Ay2, Bx2, By2, Cx2, Cy2;	// i.e. 'Ax squared', etc. For making the formula more readable. Hopefully.

			Ax = this.startX; Ay = this.startY;
			Bx = this.endX; By = this.endY;
			Cx = this.getControlPoint()[0]; Cy = this.getControlPoint()[1];
			Ax2 = Ax*Ax; Ay2 = Ay*Ay; Bx2 = Bx*Bx; By2 = By*By; Cx2 = Cx*Cx; Cy2 = Cy*Cy;

			Py = ( ( (Bx-Ax) * (Cx2+Cy2-Bx2-By2) ) - ( (Cx-Bx) * (Bx2+By2-Ax2-Ay2) ) ) / ( (2 * (Cy-By) * (Bx-Ax) ) - (2 * (By-Ay) * (Cx-Bx) ) );
			Px = ( (Bx2+By2-Ax2-Ay2) - (2 * Py * (By-Ay) ) ) / ( 2 * (Bx-Ax) );
			Pr = distance(Px, Py, Ax, Ay);
			Py = Math.round(Py);
			Px = Math.round(Px);
			Pr = Math.round(Pr);
			document.getElementById("arcCenter").innerHTML = '(' + Px + ', ' + Py + ', ' + Pr + ')';
			this.arc = [Px, Py, Pr];
		}
		return this.arc;
	}

	this.draw = function() {
	    ctx.beginPath();
	    ctx.strokeStyle = this.highlighted ? selectColor : dendriteColor;
	    ctx.lineWidth = this.highlighted ? 1 : 0.5;
		// If this dendrite creates a feedback loop with another cell, then curve the dendrite lines
		var loop = false;
		// Iterate through the origin cell's input dendrites and see if any come from the current destination cell
		if (this.originCell != null) {
			for (let i = 0; i < this.originCell.inputDendrites.length; i++) {
				if (this.originCell.inputDendrites[i].originCell == null) continue;
				if (this.originCell.inputDendrites[i].originCell.deleted) continue;
				if (this.originCell.inputDendrites[i].originCell.id === this.destinationCell.id) {
					loop = true;
					break;
				}
			}
		}	
		if (loop) {
			this.getArc();
			ctx.beginPath();
			// ctx.moveTo(this.arc[0], this.arc[1]);
			ctx.arc(this.arc[0], this.arc[1], this.arc[2], 0, 2*Math.PI);
			// ctx.quadraticCurveTo(this.controlPoint[0], this.controlPoint[1], this.endX, this.endY);
			ctx.stroke();
			ctx.closePath();
		} else {
			ctx.beginPath();
			ctx.moveTo(this.startX, this.startY);
		    ctx.lineTo(this.endX, this.endY);
		    ctx.stroke();
		    ctx.closePath();
			// Draw arrow
		    if (this.getArrowCoords()) {
		    	ctx.beginPath();
		    	ctx.moveTo(this.arrowCoords[0], this.arrowCoords[1]);
		    	ctx.lineTo(Math.round(this.midpointX), Math.round(this.midpointY));
		    	ctx.lineTo(this.arrowCoords[2], this.arrowCoords[3]);
		    	ctx.stroke();
		    	ctx.closePath();
		    }
		}
	}

	this.delete = function() {
		this.deleted = true;
	}

	this.highlight = function() {
		this.highlighted = true;
		highlightedDendrite = this.id;
	}

	this.unhighlight = function() {
		this.highlighted = false;
		highlightedDendrite = -1;
	}
}

function countCells(includeDeleted = false) {
	if (includeDeleted) {
		return Cells.length;
	} else {
		var count = 0;
		for (let i = 0; i < Cells.length; i++) {
			if (!Cells[i].deleted) {
				count++;
			}
		}
		return count;
	}
}

function countDendrites(DendriteArray = null, includeDeleted = false) {
	var tempArray;
	if (DendriteArray == null) {
		tempArray = Dendrites;
	} else {
		tempArray = DendriteArray;
	}
	if (includeDeleted) {
		return tempArray.length;
	} else {
		var count = 0;
		for (let i = 0; i < tempArray.length; i++) {
			if (!tempArray[i].deleted) {
				count++;
			}
		}
		return count;
	}
}

function distance(x1, y1, x2, y2) {
	// Use the distance formula to calculate the distance between two points.
	return Math.sqrt( Math.pow( (x2-x1), 2 ) + Math.pow( (y2-y1), 2 ) );
}

function watch() {
	document.getElementById("stimulateCheck").innerHTML = stimulationInProgress;
	document.getElementById("currentWedgeAngle").innerHTML = Math.round(Cells[0].currentWedgeAngle / Math.PI * 180 + 90);
	// Count active cells
	var activeTemp = 0;
	var firingTemp = 0;
	for (let i = 0; i < Cells.length; i++) {
		if (Cells[i].deleted) continue;
		if (Cells[i].active) activeTemp++;
		if (Cells[i].firing) firingTemp++;
	}
	activeCellCount = activeTemp;
	firingCellCount = firingTemp;
	// If there is activity in the mesh, then enable the pause button
	document.getElementById("pauseActivity").disabled = activeCellCount ? false : true;
	updateStatisticsTable();
}

function checkForCollision(x,y,radius = 0) {
	var collision = false;
	for (var i = 0; i < Cells.length; i++) {
		if (Cells[i].deleted) continue;
		if (distance(x, y, Cells[i].x, Cells[i].y) <= Cells[i].r + radius) {
			// If the distance between the mouse and this cell's center is less than this cell's radius, then we have a collision.
			collision = Cells[i];
			break;
		}
	}
	return collision;
}

function setTip(text = '', time = 0) {
	// Displays a message above the canvas, optionally for a given time.
	document.getElementById("tip").innerHTML = text;
	if (time) {
		window.setTimeout(function () { setTip(); } , time);
	}
}

function setupWorkspace() {
	// Initial setup of the workspace includes one cell and one dendrite
	var firstCell = addCell(75, 250, 20, 1, 1, 250, false);
	// Create the first dendrite, which is a special case: it doesn't have an origin cell
	// because the first cell is stimulated by clicking the "start" or "step" button.
	addDendrite(null, firstCell, 0, firstCell.y, firstCell.x-firstCell.r, firstCell.y);
	updateStatisticsTable();
  	updateCellInfoTable();
}

function clearWorkspace() {
	resetWorkspace();
	Cells = [];
	Dendrites = [];
	setupWorkspace();
}

function resetWorkspace() {
	// Stop stimulating if necessary
	stopStimulating();
	// Halt all ongoing wedge animations and reset all cell potentials to zero
	for (let i = 0; i < Cells.length; i++) {
		if (Cells[i].deleted) continue;
		Cells[i].reset();
	}
	fireCount = stimulationCount = firingNow = 0;
	document.getElementById("tip").innerHTML = '';
	document.getElementById("startStimulate").style.display = 'block';
	document.getElementById("startStimulate").disabled = false;
	document.getElementById("stopStimulate").style.display = 'none';
	document.getElementById("stepStimulate").disabled = false;
	document.getElementById("pauseActivity").style.display = 'block';
	document.getElementById("pauseActivity").disabled = false;
	document.getElementById("resumeActivity").style.display = 'none';
	updateCellInfoTable();
	updateStatisticsTable();
}

function workspaceMouseClick(event) {
	var x = event.clientX - canvas.parentElement.offsetLeft + window.pageXOffset;
	var y = event.clientY - canvas.parentElement.offsetTop + window.pageYOffset;
	// Are we clicking on a cell body?
	var collision = checkForCollision(x,y);

	if (drawingDendrite) {
		if (collision instanceof Cell) {
			if (collision.selected) {
				// If we're clicking on the original (selected) cell, then deselect it
				collision.unselect();
				collision.highlight();
			} else {
				if (countDendrites() < dendriteLimit) {
					// If we're clicking on a different (non-selected) cell, then create a dendrite between the selected cell and this cell
					addDendrite(Cells[selectedCell], collision, Cells[selectedCell].x, Cells[selectedCell].y, collision.x, collision.y);
				} else {
					setTip('You\'ve added the maximum number of connections.', 5000);
				}
				// Unselect (but don't highlight) the selected cell
				Cells[selectedCell].unselect();
			}
		} else {
			// Deselect the selected cell
			Cells[selectedCell].unselect();
		}
	} else {
		if (collision instanceof Cell) {
			// Select the cell and enter dendrite-drawing mode
			collision.select();			
		} else {
			// If there's room, add a cell at the current mouse location
			var newRadius = 20;
			var canvasBufferMinimum = newRadius+highlightWidth+highlightOffset;
			var canvasBufferMaximum = 500-newRadius-highlightWidth-highlightOffset;

			if (x > canvasBufferMaximum || x < canvasBufferMinimum
				|| y > canvasBufferMaximum || y < canvasBufferMinimum
				|| checkForCollision(x,y,newRadius+interCellBuffer)) {
				setTip("There is not enough room to place a cell here.", 5000);
			} else {
				var threshold = parseInt(document.getElementById("thresholdSetting").value);
				var firepower = parseInt(document.getElementById("firepowerSetting").value);
				var refactoryPeriod = parseInt(document.getElementById("refactoryPeriodSetting").value);
				addCell(x, y, newRadius, threshold, firepower, refactoryPeriod);
			}
		}
	}
}

function workspaceMove(event) {
	// Show the mouse coordinates within the canvas for reference
	var x = event.clientX - canvas.parentElement.offsetLeft + window.pageXOffset;
    var y = event.clientY - canvas.parentElement.offsetTop + window.pageYOffset;
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
		Cells[highlightedCell].unhighlight();
	}
}

function clickStimulateButton() {	
	document.getElementById("stopStimulate").style.display = "block";
	document.getElementById("stopStimulate").dispatchEvent(new Event('mouseover'));
	document.getElementById("startStimulate").style.display = "none";
	document.getElementById("stepStimulate").disabled = true;
	Cells[0].stimulate(1);
	stimulationInProgress = setInterval(function() { Cells[0].stimulate(1); }, 1000);
}

function stopStimulating() {
	if (stimulationInProgress) {
		clearInterval(stimulationInProgress);
		stimulationInProgress = false;
		document.getElementById("stopStimulate").style.display = "none";
		document.getElementById("startStimulate").style.display = "block";
		document.getElementById("startStimulate").dispatchEvent(new Event('mouseover'));
		document.getElementById("stepStimulate").disabled = false;
	}
}

function pauseActivity() {
	for (let i = 0; i < Cells.length; i++) {
		if (Cells[i].deleted) continue;
		Cells[i].locked = true;
	}
	document.getElementById("resumeActivity").style.display = "block";
	document.getElementById("resumeActivity").dispatchEvent(new Event('mouseover'));
	document.getElementById("pauseActivity").style.display = "none";
	document.getElementById("stopStimulate").disabled = true;
	document.getElementById("startStimulate").disabled = true;
}

function resumeActivity() {
	document.getElementById("resumeActivity").style.display = "none";
	document.getElementById("pauseActivity").style.display = "block";
	document.getElementById("pauseActivity").dispatchEvent(new Event('mouseover'));
	document.getElementById("stopStimulate").disabled = false;
	document.getElementById("startStimulate").disabled = false;
	for (let i = 0; i < Cells.length; i++) {
		Cells[i].locked = false;
	}
}

function updateThresholdValue() {
	document.getElementById("thresholdValue").innerHTML = document.getElementById("thresholdSetting").value;
}

function updateFirepowerValue() {
	document.getElementById("firepowerValue").innerHTML = document.getElementById("firepowerSetting").value;
}

function updateRefactoryPeriodValue() {
	document.getElementById("refactoryPeriodValue").innerHTML = document.getElementById("refactoryPeriodSetting").value;
}

function addDendrite(originCell = null, destinationCell, startX, startY, endX, endY) {
	// Create a new Dendrite object
	var newDen = new Dendrite(originCell, destinationCell, startX, startY, endX, endY);
	newDen.id = Dendrites.length;
	Dendrites.push(newDen);

	// Add the dendrite to its origin and destination cells
	if (originCell != null) {
		originCell.outputDendrites.push(newDen);
	}
	destinationCell.inputDendrites.push(newDen);
	updateCellInfoTable();
	updateStatisticsTable();
}

function addCell(newCellX, newCellY, newRadius, newThreshold, newFirePower, refactoryPeriod, initialHighlight = true) {
	// Check for collisions
	collision = checkForCollision(newCellX, newCellY);
	if (collision) {
		return false;
	}
	// Create a new cell object	
	var newCell = new Cell(newCellX, newCellY, newRadius, newThreshold, newFirePower, refactoryPeriod);

	// Add the cell to the Cells array and draw it
	newCell.id = Cells.length;
	Cells.push(newCell);
	updateCellInfoTable();
	updateStatisticsTable();
	if (initialHighlight) {
		newCell.highlight();
	}
	return newCell;
}

function deleteCell() {
	// Delete the currently selected cell (unless it's the first cell)
	if (selectedCell !== 0) {
		var cell = Cells[selectedCell];
		cell.unselect();
		cell.delete();
		document.getElementById("contextMenu").style.display = "none";
	}
}
 
function updateCellInfoTable(cellid = null, property = null, value = null) {
	var tbody = document.getElementById("cellInfoTable").getElementsByTagName('tbody')[0];
	if (cellid == null && property == null && value == null) {
		// Update the whole table. Delete the rows in the cell info table; then add them back.
		var rowCount = tbody.rows.length;	// Copy this so it doesn't change as you loop through and delete the rows one at a time
		for (var j = 0; j < rowCount; j++) {
			tbody.deleteRow(0);	// Careful. Must pass 0 for each loop, because as one row is deleted, the others move up.
		}
		var rowCounter = 0;
		for (let i = 0; i < Cells.length; i++) {
			let cell = Cells[i];
			if (cell.deleted) continue;
			let row = tbody.insertRow(rowCounter);
			rowCounter++;
			row.id = "cellRow"+cell.id;
			row.addEventListener('mouseover', function() { cell.highlight(); });
			row.addEventListener('mouseout', function() { cell.unhighlight(); });
			row.addEventListener('click', function() { cell.toggleSelect(); });
			row.insertCell(0).innerHTML = rowCounter;
			row.insertCell(1).innerHTML = "("+cell.x+", "+cell.y+")";
			row.insertCell(2).innerHTML = cell.getStatus();
			row.insertCell(3).innerHTML = cell.potential;
			row.insertCell(4).innerHTML = cell.threshold;
			row.insertCell(5).innerHTML = cell.firePower;
			row.insertCell(6).innerHTML = cell.refactoryPeriod;
			row.insertCell(7).innerHTML = cell.inputDendrites.length;
			row.insertCell(8).innerHTML = cell.outputDendrites.length;
		}
	} else if (cellid == null || property == null || value == null) {
		console.log('Missing argument in updateCellInfoTable().');
		return;		
	} else if (document.getElementById("cellRow"+cellid)) {
		var row = document.getElementById("cellRow"+cellid)
		// Update the given property of the given cell
		switch (property) {
			case 'status'		   : row.children[2].innerHTML = value; break;
			case 'potential'	   : row.children[3].innerHTML = value; break;
			case 'threshold'	   : row.children[4].innerHTML = value; break;
			case 'firePower'	   : row.children[5].innerHTML = value; break;
			case 'refactoryPeriod' : row.children[6].innerHTML = value; break;
			case 'input'		   : row.children[7].innerHTML = value; break;
			case 'output'		   : row.children[8].innerHTML = value; break;
			default 			   : console.log('Unrecognized property passed to updateCellInfoTable().');
		}
	}	
}

function updateStatisticsTable() {
	document.getElementById("totalCells").innerHTML = countCells();
	document.getElementById("totalDendrites").innerHTML = countDendrites();
	document.getElementById("totalFires").innerHTML = fireCount;
	document.getElementById("totalStimulations").innerHTML = stimulationCount;
	document.getElementById("firingNow").innerHTML = firingCellCount;
	document.getElementById("meshActivity").innerHTML = Math.round(activeCellCount / countCells() * 100) + '%';
}

function drawIcon() {
	// Draw the Mesh icon
	var iconctx = document.getElementById("meshIcon").getContext('2d');
	iconctx.clearRect(0,0,40,40);
	iconctx.beginPath();
	iconctx.fillStyle = selectColor;
	iconctx.arc(20,20,20,0,2*Math.PI);
	iconctx.fill();
	iconctx.closePath();
	iconctx.beginPath();
	iconctx.fillStyle = firingCellCount ? fireColor : backgroundColor;
	iconctx.moveTo(20,20);
	iconctx.arc(20,20,15,-Math.PI/2,2*Math.PI/3);
	iconctx.fill();
	iconctx.closePath();
}

function draw() {
	ctx.clearRect(0, 0, 500, 500);
	// Draw all dendrites
	for (let d = 0; d < Dendrites.length; d++) {
		if (Dendrites[d].deleted) continue;
		Dendrites[d].draw();
	}
	// Draw all cells
	for (let c = 0; c < Cells.length; c++) {
		if (Cells[c].deleted) continue;
		Cells[c].draw();
	}
	drawIcon();
}

function init() {
	canvas.width = 500;
	canvas.height = 500;

	drawIcon();
	
	// Add event listeners
	canvas.addEventListener("click", workspaceMouseClick);
	canvas.addEventListener("mousemove", workspaceMove);
	canvas.addEventListener("mouseout", workspaceMoveOut);
	document.getElementById("startStimulate").addEventListener("click", clickStimulateButton);
	document.getElementById("stopStimulate").addEventListener("click", stopStimulating);
	document.getElementById("pauseActivity").addEventListener("click", pauseActivity);
	document.getElementById("resumeActivity").addEventListener("click", resumeActivity);
	document.getElementById("stepStimulate").addEventListener("click", function() { Cells[0].stimulate(1); });
	document.getElementById("resetWorkspace").addEventListener("click", resetWorkspace);
	document.getElementById("clearWorkspace").addEventListener("click", clearWorkspace);
	document.getElementById("deleteCell").addEventListener("click", deleteCell);
	document.getElementById("thresholdSetting").addEventListener("change", updateThresholdValue);
	document.getElementById("thresholdSetting").addEventListener("mousemove", updateThresholdValue);
	document.getElementById("firepowerSetting").addEventListener("change", updateFirepowerValue);
	document.getElementById("firepowerSetting").addEventListener("mousemove", updateFirepowerValue);
	document.getElementById("refactoryPeriodSetting").addEventListener("change", updateRefactoryPeriodValue);
	document.getElementById("refactoryPeriodSetting").addEventListener("mousemove", updateRefactoryPeriodValue);

	// Tips
	document.getElementById("startStimulate").addEventListener("mouseover", function() { setTip('Click "Start" to start automatically stimulating the first cell once per second.'); });
	document.getElementById("startStimulate").addEventListener("mouseout", function() { setTip(); } );
	document.getElementById("stopStimulate").addEventListener("mouseover", function() { setTip('Click "Stop" to stop automatically stimulating the first cell once per second.'); });
	document.getElementById("stopStimulate").addEventListener("mouseout", function() { setTip(); } );
	document.getElementById("stepStimulate").addEventListener("mouseover", function() { setTip('Click "Step" to stimulate the first cell just once.'); });
	document.getElementById("stepStimulate").addEventListener("mouseout", function() { setTip(); } );
	document.getElementById("pauseActivity").addEventListener("mouseover", function() { setTip('Click "Pause" to halt all neuron activity.'); });
	document.getElementById("pauseActivity").addEventListener("mouseout", function() { setTip(); } );
	document.getElementById("resumeActivity").addEventListener("mouseover", function() { setTip('Click "Resume" to resume neuron activity.'); });
	document.getElementById("resumeActivity").addEventListener("mouseout", function() { setTip(); } );
	document.getElementById("resetWorkspace").addEventListener("mouseover", function() { setTip('Click "Reset" to reset the neurons and Mesh statistics.'); });
	document.getElementById("resetWorkspace").addEventListener("mouseout", function() { setTip(); } );
	document.getElementById("clearWorkspace").addEventListener("mouseover", function() { setTip('Click "Clear" to delete all neurons.'); });
	document.getElementById("clearWorkspace").addEventListener("mouseout", function() { setTip(); } );

	setupWorkspace();	
};

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ) {
            window.setTimeout(callback, 1000 / 60);
          };
})();

function loop() {
  watch();
  draw();
  requestAnimFrame(loop);
};

init();
loop();