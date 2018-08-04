var				   canvas = document.getElementById('workspace'),
					  ctx = canvas.getContext("2d"),
				    graph = document.getElementById('graph');
		  	     graphctx = graph.getContext("2d");
		   		graphArea = [],
		   	  graphPoints = [],
		   	   graphDialX = 0,
		   	   timeLables = [],
	  recordingInProgress = false;
			    undoStack = [],
	stimulationInProgress = false,	// False or the timer ID of the stimulation in progress
		  	   movingCell = false;
 		  activeCellCount = 0,
		  firingCellCount = 0,
		  highlightedCell = -1,
	  highlightedDendrite = -1,
			 selectedCell = -1,
					Cells = [],
				Dendrites = [],
			dendriteLimit = 30,
			   arrowWidth = 12,
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
		 stimulationCount = 0,
		 	   showingTip = false;

// Object constructors
function Cell(x, y, r, threshold, firePower, refactoryPeriod) {
	this.x = this.oldX = x;
	this.y = this.oldY = y;
	this.r = r;
	this.positionStack = []; 	// An array of arrays of the form [x,y] representing this cell's position history
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
		if (!this.selected) {
			for (let i = 0; i < this.outputDendrites.length; i++) {
				if (this.outputDendrites[i].deleted) continue;
				this.outputDendrites[i].unhighlight();
			}
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
		// Highlight all output dendrites as well
		for (let i = 0; i < this.outputDendrites.length; i++) {
			if (this.outputDendrites[i].deleted) continue;
			this.outputDendrites[i].highlight();
		}
		var row = document.getElementById('cellRow'+this.id);
		for (let i = 0; i < row.children.length; i++) {
			row.children[i].style.color = backgroundColor;
			row.children[i].style.backgroundColor = selectColor;
		}
		if (this.id !== 0) {
			// Don't show the delete button for the first cell
			document.getElementById("deleteCell").style.display="block";
			document.getElementById("deleteCell").classList.add('w3-animate-opacity');
		}
	}

	this.unselect = function() {
		// Set selected flags
		selectedCell = -1;
		this.selected = false;
		// Unhighlight all output dendrites as well
		for (let i = 0; i < this.outputDendrites.length; i++) {
			if (this.outputDendrites[i].deleted) continue;
			this.outputDendrites[i].unhighlight();
		}
		var row = document.getElementById('cellRow'+this.id);
		for (let i = 0; i < row.children.length; i++) {
			row.children[i].style.color = 'initial';
			row.children[i].style.backgroundColor = 'initial';
		}
		document.getElementById("deleteCell").style.display="none";
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
		updateCellInfoTable();
	}

	this.undelete = function() {
		this.deleted = false;
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

	this.getArrowCoords = function(loop) {
		// Calculate the coordinates for each side of the arrow
		// Uses global arrowWidth variable
		// Returns three coordinates in an array of six elements: x1, y1, pointX, pointY, x2, y2
		if (arrowWidth === 0) {
			console.log('Unable to calculate arrow coordinates of dendrite #'+this.id+'. (Arrow width cannot be zero.)');
			return false;
		}
		// Find the coordinates of the point of the arrow, which lies on the circumference of the destination cell
		var theta = Math.atan2(this.startY-this.endY, this.startX-this.endX);
		var Px = Math.round(this.destinationCell.r * Math.cos(theta) + this.endX);
		var Py = Math.round(this.destinationCell.r * Math.sin(theta) + this.endY);
	    var angle = Math.atan2(Py-this.startY,Px-this.startX);
	    var x1 = Math.round(Px-arrowWidth*Math.cos(angle-Math.PI/6));
	    var y1 = Math.round(Py-arrowWidth*Math.sin(angle-Math.PI/6));
	    var x2 = Math.round(Px-arrowWidth*Math.cos(angle+Math.PI/6));
	    var y2 = Math.round(Py-arrowWidth*Math.sin(angle+Math.PI/6));
		this.arrowCoords = [x1,y1,Px,Py,x2,y2];
		return this.arrowCoords;
	}

	this.getControlPoint = function() {
		// Calculate the coordinates of the control point needed for drawing the arc between two cells in a lopp
		// Uses global curveWidth variable
		// Returns the coordinates in an array [x, y].
		var x, y, startX;
		if (this.startX === this.endY) {
			if (this.startY < this.endY) {
				x = this.startX + curveWidth;
			} else {
				x = this.startX - curveWidth;
			}
			y = this.midpointY;
		} else if (this.startY < this.endY) {
			x = Math.round(this.midpointX + (curveWidth * Math.sin(Math.PI/2 - Math.asin(2*(this.startX-this.midpointX)/this.length))));
			y = Math.round(this.midpointY + (curveWidth * Math.cos(Math.PI/2 - Math.asin(2*(this.startX-this.midpointX)/this.length))));
		} else {
			x = Math.round(this.midpointX - (curveWidth * Math.sin(Math.PI/2 - Math.asin(2*(this.startX-this.midpointX)/this.length))));
			y = Math.round(this.midpointY + (curveWidth * Math.cos(Math.PI/2 - Math.asin(2*(this.startX-this.midpointX)/this.length))));
		}			
		this.controlPoint = [x, y];
		return this.controlPoint;
	}

	this.getArc = function() {
		// Calculate (if needed) the coordinates and radius of the arc to draw between two cells
		// Returns the coordinates in an array [x, y, radius].

		// Define vertices of triangle ABC with circumcenter P
		var Ax, Ay, Bx, By, Cx, Cy, Px, Py, Pr;
		var Ax2, Ay2, Bx2, By2, Cx2, Cy2;	// i.e. 'Ax squared', etc. For making the formula more readable. Hopefully.
		var startAngle, endAngle;
		Ax = this.startX; Ay = this.startY;
		Bx = this.endX; By = this.endY;
		Cx = this.getControlPoint()[0]; Cy = this.getControlPoint()[1];
		Ax2 = Ax*Ax; Ay2 = Ay*Ay; Bx2 = Bx*Bx; By2 = By*By; Cx2 = Cx*Cx; Cy2 = Cy*Cy;
		if (Ax === Bx) {
			// We've got a vertical line. The formula for calculating Px returns undefined when Ax==Bx, since 2(Bx-Ax) is the denominator.
			// So, rotate the entire triangle ABC by 90 degrees on the midpoint of AB, so we're not working with a vertical line anymore.
			oldAx = Ax; oldAy = Ay; oldBx = Bx; oldBy = By;
			var newStartPoint = rotate(this.startX, this.startY, this.midpointX, this.midpointY, Math.PI/2);
			var newEndPoint = rotate(this.endX, this.endY, this.midpointX, this.midpointY, Math.PI/2);
			var newControlPoint = rotate(Cx, Cy, this.midpointX, this.midpointY, Math.PI/2);
			Ax = newStartPoint[0]; Ay = newStartPoint[1]; Ax2 = Ax*Ax; Ay2 = Ay*Ay;
			Bx = newEndPoint[0]; By = newEndPoint[1]; Bx2 = Bx*Bx; By2 = By*By;
			Cx = newControlPoint[0]; Cy = newControlPoint[1]; Cx2 = Cx*Cx; Cy2 = Cy*Cy;
			Py = ( ( (Bx-Ax) * (Cx2+Cy2-Bx2-By2) ) - ( (Cx-Bx) * (Bx2+By2-Ax2-Ay2) ) ) / ( (2 * (Cy-By) * (Bx-Ax) ) - (2 * (By-Ay) * (Cx-Bx) ) );
			Px = ( (Bx2+By2-Ax2-Ay2) - (2 * Py * (By-Ay) ) ) / ( 2 * (Bx-Ax) );
			// Rotate everything back -90 degrees.
			Ax = oldAx; Ay = oldAy; Bx = oldBx; By = oldBy;
			var P = rotate(Px, Py, this.midpointX, this.midpointY, -Math.PI/2);
			Px = P[0]; Py = P[1];
		} else {
			// Calculate the coordinates of the center point P of the arc
			Py = ( ( (Bx-Ax) * (Cx2+Cy2-Bx2-By2) ) - ( (Cx-Bx) * (Bx2+By2-Ax2-Ay2) ) ) / ( (2 * (Cy-By) * (Bx-Ax) ) - (2 * (By-Ay) * (Cx-Bx) ) );
			Px = ( (Bx2+By2-Ax2-Ay2) - (2 * Py * (By-Ay) ) ) / ( 2 * (Bx-Ax) );
		}
		Pr = Math.round(distance(Px, Py, Ax, Ay));
		Py = Math.round(Py);
		Px = Math.round(Px);
		startAngle = Math.atan2(Ay - Py, Ax - Px);
		endAngle = Math.atan2(By - Py, Bx - Px);
		this.arc = [Px, Py, Pr, startAngle, endAngle];
		return this.arc;
	}

	this.draw = function() {
	    ctx.strokeStyle = ctx.fillStyle = this.highlighted ? selectColor : dendriteColor;
	    ctx.lineWidth = this.highlighted ? 2 : 1;
		// If this dendrite creates a feedback loop with another cell, then curve the dendrite lines
		var loop = false;
		// Does this dendrite create a loop between any two cells?
		for (let i = 0; i < Dendrites.length; i++) {
			if (Dendrites[i].deleted) continue;
			if (Dendrites[i].originCell == null) continue;
			if (Dendrites[i].originCell == this.destinationCell && Dendrites[i].destinationCell == this.originCell) {
				loop = true;
				break;
			}
		}
		if (loop) {
			this.getArc();
			ctx.beginPath();
			ctx.arc(this.arc[0], this.arc[1], this.arc[2], this.arc[3], this.arc[4]);
			ctx.stroke();
			ctx.closePath();
		} else {
			var apparentStartX = this.startX; apparentStartY = this.startY;
			var apparentEndX = this.endX; apparentEndY = this.endY;
			// If the line is vertical or horizontal we have to be careful that canvas doesn't draw it blurry when the lineWidth is odd.
			if (ctx.lineWidth % 2) {
				if (this.startX === this.endX) apparentStartX = this.startX - 0.5;				
				if (this.startY === this.endY) apparentStartY = this.startY - 0.5;
			}
			ctx.beginPath();
			ctx.moveTo(apparentStartX, apparentStartY);
		    ctx.lineTo(apparentEndX, apparentEndY);
		    ctx.stroke();
		    ctx.closePath();
			// Draw arrow
		    this.getArrowCoords();
	    	ctx.beginPath();
	    	ctx.moveTo(this.arrowCoords[0], this.arrowCoords[1]);
	    	ctx.lineTo(this.arrowCoords[2], this.arrowCoords[3]);
	    	ctx.lineTo(this.arrowCoords[4], this.arrowCoords[5]);
	    	ctx.closePath();
	    	ctx.fill();
		}	    
	}

	this.delete = function() {
		this.deleted = true;
	}

	this.undelete = function() {
		this.deleted = false;
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
			if (!Cells[i].deleted) count++;
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

function rotate(x, y, cx, cy, angle) {
	// Rotate a point (x,y) around pivot point (cx, cy) by an angle in radians.
	var newX = Math.cos(angle) * (x - cx) - Math.sin(angle) * (y - cy) + cx;
	var newY = Math.sin(angle) * (x - cx) + Math.cos(angle) * (y - cy) + cy;
	return [newX, newY];
}

function watch() {
	document.getElementById("stimulateCheck").innerHTML = stimulationInProgress;
	arcInfo = '';
	wedgeInfo = '';
	controlPoint = '';
	arrowInfo = '';
	if (highlightedCell > -1) {
		var lastCell = Cells[highlightedCell];
		wedgeInfo = Math.round(lastCell.currentWedgeAngle / Math.PI * 180 + 90);
		var arcInfo = '';
		for (let i = 0; i < lastCell.outputDendrites.length; i++) {
			if (lastCell.outputDendrites[i].arc != null) {
				let start = Math.round(lastCell.outputDendrites[i].arc[3] / Math.PI * 180 + 90);
				let end = Math.round(lastCell.outputDendrites[i].arc[4] / Math.PI * 180 + 90);
				arcInfo += '[' + i + '] (' + lastCell.outputDendrites[i].arc[0] + ', ' + lastCell.outputDendrites[i].arc[1] + ', ' + lastCell.outputDendrites[i].arc[2] + ', ' + start + ', ' + end + ')<br />';
				controlPoint += '[' + i + '] (' + lastCell.outputDendrites[i].controlPoint[0] + ', ' + lastCell.outputDendrites[i].controlPoint[1] + ')<br />';
			}
		}
		for (let j = 0; j < lastCell.inputDendrites.length; j++) {
			if (lastCell.inputDendrites[j].arrowCoords != null) {
				arrowInfo += '[' + j + '] (' + lastCell.inputDendrites[j].arrowCoords[0] + ', ' + lastCell.inputDendrites[j].arrowCoords[1] + '), (' + lastCell.inputDendrites[j].arrowCoords[2] + ', ' + lastCell.inputDendrites[j].arrowCoords[3] + '), (' + lastCell.inputDendrites[j].arrowCoords[4] + ', ' + lastCell.inputDendrites[j].arrowCoords[5] + ')<br />';
			}
		}
	}
	document.getElementById("currentWedgeAngle").innerHTML = wedgeInfo;
	document.getElementById("controlPoint").innerHTML = controlPoint;
	document.getElementById("arcInfo").innerHTML = arcInfo;
	document.getElementById("arrowInfo").innerHTML = arrowInfo;
	var tempMovingCell = movingCell;
	if (tempMovingCell instanceof Cell) {
		var inDens = '';
		for (let k = 0; k < tempMovingCell.inputDendrites.length; k++) {
			inDens += tempMovingCell.inputDendrites[k].id + ', ';
		}
		tempMovingCell = tempMovingCell.id + ': ' + inDens;
	}
	document.getElementById("movingCell").innerHTML = tempMovingCell;
}

function checkForCollision(x, y, additionalRadius = 0, ignoreCellID = -1) {
	var collision = false;
	for (let i = 0; i < Cells.length; i++) {
		if (Cells[i].deleted) continue;
		if (distance(x, y, Cells[i].x, Cells[i].y) <= Cells[i].r + additionalRadius) {
			// If the distance between the mouse and this cell's center is less than this cell's radius, then we have a collision.
			if (ignoreCellID > -1 && Cells[i].id === ignoreCellID) {
				// Ignore this collision
				continue;
			} else {
				collision = Cells[i];
				break;
			}
		}
	}
	return collision;
}

function checkForRoom(x, y, r, ignoreCellID = -1) {
	// Checks if there is room for a cell of radius r and point x,y, including all cell buffers
	// Returns true of there is room, false if not.
	var canvasBufferMinimum = r + highlightWidth + highlightOffset;
	var canvasBufferMaximum = canvas.width - r - highlightWidth - highlightOffset;
	return (x < canvasBufferMaximum	&& x > canvasBufferMinimum
		 	&& y < canvasBufferMaximum && y > canvasBufferMinimum
		 	&& !checkForCollision(x, y, r + interCellBuffer, ignoreCellID));	
}

function setTip(text = '', time = 0) {
	// Displays a message above the canvas, optionally for a given time.
	if (text) {
		showingTip = true;
		document.getElementById("tip").style.display = "block";
		document.getElementById("tip").innerHTML = text;
		if (time) {
			window.setTimeout(function () { setTip(); } , time);
		}
	} else {
		showingTip = false;	
		document.getElementById("tip").style.display = "none";
		document.getElementById("tip").innerHTML = '&nbsp;';
	}	
}

function setupWorkspace() {
	// Initial setup of the workspace includes one cell and one dendrite
	var firstCell = addCell(75, 250, 20, 1, 1, 250, false);
	// Create the first dendrite, which is a special case: it doesn't have an origin cell
	// because the first cell is stimulated by clicking the "start" or "step" button.
	addDendrite(null, firstCell, 0, firstCell.y, firstCell.x, firstCell.y);
  	updateCellInfoTable();
}

function clearWorkspace() {
	resetWorkspace();
	Cells = [];
	Dendrites = [];
	undoStack = [];
	timeLables = [];
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
	fireCount = stimulationCount = activeCellCount = 0;
	document.getElementById("tip").innerHTML = '';
	document.getElementById("startStimulate").style.display = 'block';
	document.getElementById("startStimulate").disabled = false;
	document.getElementById("stopStimulate").style.display = 'none';
	document.getElementById("pauseActivity").style.display = 'block';
	document.getElementById("pauseActivity").disabled = true;
	document.getElementById("resumeActivity").style.display = 'none';
	updateCellInfoTable();
	// Reset the activity graph
	stopRecord();
	graphDialX = graphArea[0];
	graphPoints = [];
}

function workspaceMouseDown(event) {
	var x = event.clientX - canvas.parentElement.offsetLeft + window.pageXOffset;
	var y = event.clientY - canvas.parentElement.offsetTop + window.pageYOffset;
	// Are we clicking on a cell body?
	var collision = checkForCollision(x,y);
	if (collision instanceof Cell && collision.id > 0) {
		movingCell = collision;
		movingCell.oldX = collision.x;
		movingCell.oldY = collision.y;			
	}
}

function workspaceMouseUp(event) {
	if (showingTip) {
		setTip();
		return;
	}
	var x = event.clientX - canvas.parentElement.offsetLeft + window.pageXOffset;
	var y = event.clientY - canvas.parentElement.offsetTop + window.pageYOffset;
	var collision = checkForCollision(x,y);
	if (selectedCell > -1) {
		if (collision instanceof Cell) {
			if (collision.selected) {
				// If we're clicking on the original (selected) cell, then deselect it
				collision.unselect();
				collision.highlight();
			} else {
				if (countDendrites() < dendriteLimit) {
					// If we're clicking on a different (non-selected) cell, then create a dendrite between the selected cell and this cell
					newDendrite = addDendrite(Cells[selectedCell], collision, Cells[selectedCell].x, Cells[selectedCell].y, collision.x, collision.y);
					if (newDendrite) {
						undoStack.push(['undoAddDendrite', newDendrite]);
					}
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
	} else if (collision instanceof Cell) {
		if (collision.x === collision.oldX && collision.y === collision.oldY) {
			collision.select();
		}
	} else {
		// If there's room, add a cell at the current mouse location
		var newRadius = 20;
		var threshold = parseInt(document.getElementById("thresholdSetting").value);
		var firepower = parseInt(document.getElementById("firepowerSetting").value);
		var refactoryPeriod = parseInt(document.getElementById("refactoryPeriodSetting").value);
		newCell = addCell(x, y, newRadius, threshold, firepower, refactoryPeriod);				
		if (newCell) {
			undoStack.push(['undoAddCell', newCell]);				
		} else {
			setTip("There is not enough room to place a cell here.", 5000);
		}
	}
	if (movingCell && (movingCell.x !== movingCell.oldX || movingCell.y !== movingCell.oldY)) {
		movingCell.positionStack.push([movingCell.oldX, movingCell.oldY]);
		undoStack.push(['undoMoveCell', movingCell]);
	}
	movingCell = false;
}

function workspaceMove(event) {
	// Show the mouse coordinates within the canvas for reference
	var x = event.clientX - canvas.parentElement.offsetLeft + window.pageXOffset;
    var y = event.clientY - canvas.parentElement.offsetTop + window.pageYOffset;
    document.getElementById("mousecoords").innerHTML = "(" + x + ", " + y + ")";
    if (movingCell && checkForRoom(x, y, movingCell.r, movingCell.id)) {
    	movingCell.x = x; movingCell.y = y;
    	for (let i = 0; i < movingCell.inputDendrites.length; i++) {
    		let dendrite = Dendrites[movingCell.inputDendrites[i].id];
    		dendrite.endX = x;
    		dendrite.endY = y;
    	}
    	for (let i = 0; i < movingCell.outputDendrites.length; i++) {
    		let dendrite = Dendrites[movingCell.outputDendrites[i].id];
    		dendrite.startX = x;
    		dendrite.startY = y;
    	}
    	updateCellInfoTable(movingCell.id, 'position', [movingCell.x, movingCell.y]);
    }
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
	movingCell = false;
}

function clickStimulateButton() {	
	document.getElementById("stopStimulate").style.display = "block";
	document.getElementById("stopStimulate").dispatchEvent(new Event('mouseover'));
	document.getElementById("startStimulate").style.display = "none";
	document.getElementById("pauseActivity").disabled = false;
	document.getElementById("resumeActivity").style.display = "none";
	Cells[0].stimulate(1);
	stimulationInProgress = setInterval(function() { Cells[0].stimulate(1); }, 1000);
	startRecord();
}

function stopStimulating() {
	clearInterval(stimulationInProgress);
	stimulationInProgress = false;
	document.getElementById("startStimulate").style.display = "block";
	document.getElementById("startStimulate").dispatchEvent(new Event('mouseover'));
	document.getElementById("stopStimulate").style.display = "none";
	document.getElementById("resumeActivity").style.display = "none";
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
	// Pause the activity graph
	stopRecord();

}

function resumeActivity() {
	document.getElementById("pauseActivity").style.display = "block";
	document.getElementById("pauseActivity").dispatchEvent(new Event('mouseover'));
	document.getElementById("resumeActivity").style.display = "none";
	document.getElementById("stopStimulate").disabled = false;
	document.getElementById("startStimulate").disabled = false;
	for (let i = 0; i < Cells.length; i++) {
		Cells[i].locked = false;
	}
	// Resume the activity graph
	startRecord();
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
	// If this dendrite already exists, don't create it again.
	for (let i = 0; i < Dendrites.length; i++) {
		if (Dendrites[i].deleted) continue;
		if (Dendrites[i].originCell == originCell && Dendrites[i].destinationCell == destinationCell) {
			return false;
		}
	}
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
	return newDen;
}

function addCell(newCellX, newCellY, newRadius, newThreshold, newFirePower, refactoryPeriod, initialHighlight = true) {
	// Check for collisions
	if (checkForRoom(newCellX, newCellY, newRadius)) {	
		// Create a new cell object	
		var newCell = new Cell(newCellX, newCellY, newRadius, newThreshold, newFirePower, refactoryPeriod);
		// Add the cell to the Cells array and update tables
		newCell.id = Cells.length;
		Cells.push(newCell);
		updateCellInfoTable();
		if (initialHighlight) {
			newCell.highlight();
		}
		return newCell;
	} else {
		return false;
	}
}

function deleteCell(cellid, undoable = true) {
	cell = Cells[cellid];
	// Delete the currently selected cell (unless it's the first cell)
	cell.unselect();
	cell.delete();
	document.getElementById("deleteCell").style.display = "none";
	if (undoable) {
		undoStack.push(['undoDeleteCell', cell]);
	}
}

function undo() {
	// undo add cell; undo add dendrite
	var task = undoStack.pop();
	switch (task[0]) {
		case 'undoDeleteCell':
			if (checkForRoom(task[1].x, task[1].y, task[1].r)) {
				task[1].undelete();
			} else { 
				setTip("There is not enough room to undelete this cell.", 5000);
			}
			break;
		case 'undoAddCell':
			deleteCell(task[1].id, false);
			break;
		case 'undoAddDendrite':
			task[1].delete();
			break;
		case 'undoMoveCell':
			var oldPosition = task[1].positionStack.pop();
			if (checkForRoom(oldPosition[0], oldPosition[1], task[1].r, task[1].id)) {
		    	task[1].x = oldPosition[0]; 
		    	task[1].y = oldPosition[1];
		    	for (let i = 0; i < task[1].inputDendrites.length; i++) {
		    		let dendrite = Dendrites[task[1].inputDendrites[i].id];
		    		dendrite.endX = oldPosition[0];
		    		dendrite.endY = oldPosition[1];
		    	}
		    	for (let i = 0; i < task[1].outputDendrites.length; i++) {
		    		let dendrite = Dendrites[task[1].outputDendrites[i].id];
		    		dendrite.startX = oldPosition[0];
		    		dendrite.startY = oldPosition[1];
		    	}
    		}
			break;
		default:
			console.log('Attempted to undo an unrecognized action.');
	}
	updateCellInfoTable();
}

function getUndoDescription() {
	// Returns a human-readable description of what clicking the "undo" button will do
	if (!undoStack.length) {
		return '';
	}
	var task = undoStack[undoStack.length-1];
	switch (task[0]) {
		case 'undoDeleteCell' : return 'Undo delete cell';
		case 'undoAddCell'    : return 'Undo add cell';
		case 'undoAddDendrite': return 'Undo add dendrite';
		case 'undoMoveCell'   : return 'Undo move cell';
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
			row.insertCell(7).innerHTML = countDendrites(cell.inputDendrites);
			row.insertCell(8).innerHTML = countDendrites(cell.outputDendrites);
		}
	} else if (cellid == null || property == null || value == null) {
		console.log('Missing argument in updateCellInfoTable().');
		return;		
	} else if (document.getElementById("cellRow"+cellid)) {
		var row = document.getElementById("cellRow"+cellid)
		// Update the given property of the given cell
		switch (property) {
			case 'position'		   : row.children[1].innerHTML = "("+value[0]+", "+value[1]+")"; break;
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
	document.getElementById("meshActivity").innerHTML = Math.round(activeCellCount / countCells() * 100) + '%';
}

function drawIcon(color) {
	// Draw the Mesh icon
	var iconctx = document.getElementById("meshIcon").getContext('2d');
	iconctx.clearRect(0,0,40,40);
	iconctx.beginPath();
	iconctx.fillStyle = selectColor;
	iconctx.arc(20,20,20,0,2*Math.PI);
	iconctx.fill();
	iconctx.closePath();
	iconctx.beginPath();
	iconctx.fillStyle = color;
	iconctx.moveTo(20,20);
	iconctx.arc(20,20,15,-Math.PI/2,2*Math.PI/3);
	iconctx.fill();
	iconctx.closePath();
}

function startRecord() {
	
	recordingInProgress = window.setInterval(record, 10);
	timeLabelTimer = window.setInterval(function() { 
		timeLables.push(graphDialX);
		document.getElementById('timeLabel').innerHTML = timeLables[timeLables.length-1];
	} , 1000);
}

function stopRecord() {
	clearInterval(recordingInProgress);
	clearInterval(timeLabelTimer);
	recordingInProgress = false;
}

function record() {
	graphPoints.push([graphDialX, activeCellCount / countCells() * graphArea[3]]);
}

function drawGraph() {
	graphctx.clearRect(0,0,graph.width,graph.height);
	// graphctx.strokeStyle='yellow';
	// graphctx.moveTo(graphArea[0],graphArea[1]);
	// graphctx.rect(graphArea[0],graphArea[1],graphArea[2],graphArea[3]);
	// graphctx.stroke();
	// graphctx.closePath();

	// Draw x-axis lables
	graphctx.font = '10px Verdana';
	graphctx.fillStyle = '#AAA';
	graphctx.textAlign = 'center';
	graphctx.strokeStyle = '#AAA';
	graphctx.lineWidth = 1;


	for (let t = 0; t < timeLables.length; t++) {
		graphctx.fillText(t+1, timeLables[t], graph.height-5.5);
		graphctx.moveTo(timeLables[t], graph.height-15);
		graphctx.lineTo(timeLables[t], graph.height-20);
		graphctx.stroke();
		if (recordingInProgress && graphDialX >= graphArea[2]) {
			timeLables[t]--;
		}
	}

	// Draw y-axis gridlines
	var tickSpace = Math.round(graphArea[3]/4);
	for (let j = 1, y = graphArea[1]; y <= graphArea[1] + graphArea[3]; y = y + tickSpace, j++) {
		graphctx.beginPath();
		if (j === 5) {
			graphctx.strokeStyle = '#555';
			y = Math.ceil(y) + 0.5;	
		} else {
			graphctx.strokeStyle = '#CCC';
			y = Math.ceil(y) - 0.5;
		}
		// Make sure to draw the line BETWEEN pixels; otherwise canvas makes the line blurry.
		graphctx.moveTo(0, y);
		graphctx.lineTo(graph.width, y);
		graphctx.stroke();
		graphctx.closePath();
	}
	graphctx.textAlign = 'left';
	graphctx.moveTo(0, graphArea[1]);
	graphctx.fillText('100%', 0.5, graphArea[1]+10.5);
	graphctx.fillText('75%', 0.5, graphArea[1]+tickSpace+10.5);
	graphctx.fillText('50%', 0.5, graphArea[1]+2*tickSpace+10.5);
	graphctx.fillText('25%', 0.5, graphArea[1]+3*tickSpace+10.5);

	// Draw graph points
	graphctx.strokeStyle = selectColor;
	graphctx.lineWidth = 2;
	for (let i = 0; i < graphPoints.length-1; i++) {
		let point1 = graphPoints[i];
		let point2 = graphPoints[i+1];
		if (recordingInProgress && graphDialX >= graphArea[2]) {
			point1[0] = point1[0] - 0.5;
			point2[0] = point2[0] - 0.5;
		}
		graphctx.beginPath();
		graphctx.moveTo(point1[0], graphArea[1]+graphArea[3]-point1[1]);
		graphctx.lineTo(point2[0], graphArea[1]+graphArea[3]-point2[1]);
		graphctx.stroke();
		graphctx.closePath();
	}
	// Draw graph dial
	graphctx.strokeStyle = 'red';
	graphctx.lineWidth = 1;
	graphctx.beginPath();
	graphctx.moveTo(graphDialX, 0);
	graphctx.lineTo(graphDialX, graphArea[1]+graphArea[3]);
	graphctx.stroke();
	graphctx.closePath();

	if (recordingInProgress && graphDialX < graphArea[2]) {
		graphDialX++;
	}
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
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
	// Draw the Mesh icon
	var color = firingCellCount ? fireColor	: backgroundColor;
	drawIcon(color);
	// Enable the undo button if there is something to undo
	if (undoStack.length) {
		document.getElementById("undo").disabled = false;
		document.getElementById("undo").title = getUndoDescription();
	} else {
		document.getElementById("undo").disabled = true;
		document.getElementById("undo").title = '';
	}

	updateStatisticsTable();
	drawGraph();
}

function resize() {
	graph.width = graph.parentElement.clientWidth;
	graph.height = 150;
	// Graph area rectangle defined by startX, startY, width, height 
	graphArea = [32, 5, graph.width-32, graph.height-25];
}

function init() {
	canvas.width = 500;
	canvas.height = 500;
	
	// Add event listeners
	window.addEventListener("resize", resize);
	canvas.addEventListener("mousedown", workspaceMouseDown);
	canvas.addEventListener("mouseup", workspaceMouseUp);
	canvas.addEventListener("mousemove", workspaceMove);
	canvas.addEventListener("mouseout", workspaceMoveOut);
	document.getElementById("tip").addEventListener("click", function() { setTip(); } );
	// Buttons
	document.getElementById("startStimulate").addEventListener("click", clickStimulateButton);
	document.getElementById("stopStimulate").addEventListener("click", stopStimulating);
	document.getElementById("pauseActivity").addEventListener("click", pauseActivity);
	document.getElementById("resumeActivity").addEventListener("click", resumeActivity);
	document.getElementById("resetWorkspace").addEventListener("click", resetWorkspace);
	document.getElementById("clearWorkspace").addEventListener("click", clearWorkspace);
	// Context menu
	document.getElementById("deleteCell").addEventListener("click", function() { if (selectedCell) deleteCell(selectedCell); } );
	document.getElementById("undo").addEventListener("click", undo);
	// Settings
	document.getElementById("thresholdSetting").addEventListener("change", updateThresholdValue);
	document.getElementById("thresholdSetting").addEventListener("mousemove", updateThresholdValue);
	document.getElementById("firepowerSetting").addEventListener("change", updateFirepowerValue);
	document.getElementById("firepowerSetting").addEventListener("mousemove", updateFirepowerValue);
	document.getElementById("refactoryPeriodSetting").addEventListener("change", updateRefactoryPeriodValue);
	document.getElementById("refactoryPeriodSetting").addEventListener("mousemove", updateRefactoryPeriodValue);
	// Button tips
	// document.getElementById("startStimulate").addEventListener("mouseover", function() { setTip('Click "Start" to start automatically stimulating the first cell once per second.'); });
	// document.getElementById("startStimulate").addEventListener("mouseout", function() { setTip(); } );
	// document.getElementById("stopStimulate").addEventListener("mouseover", function() { setTip('Click "Stop" to stop automatically stimulating the first cell once per second.'); });
	// document.getElementById("stopStimulate").addEventListener("mouseout", function() { setTip(); } );
	// document.getElementById("pauseActivity").addEventListener("mouseover", function() { setTip('Click "Pause" to halt all neuron activity.'); });
	// document.getElementById("pauseActivity").addEventListener("mouseout", function() { setTip(); } );
	// document.getElementById("resumeActivity").addEventListener("mouseover", function() { setTip('Click "Resume" to resume neuron activity.'); });
	// document.getElementById("resumeActivity").addEventListener("mouseout", function() { setTip(); } );
	// document.getElementById("resetWorkspace").addEventListener("mouseover", function() { setTip('Click "Reset" to reset the neurons and Mesh statistics.'); });
	// document.getElementById("resetWorkspace").addEventListener("mouseout", function() { setTip(); } );
	// document.getElementById("clearWorkspace").addEventListener("mouseover", function() { setTip('Click "Clear" to delete all neurons.'); });
	// document.getElementById("clearWorkspace").addEventListener("mouseout", function() { setTip(); } );

	setupWorkspace();	
	resize();
	graphDialX = graphArea[0]+0.5;
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