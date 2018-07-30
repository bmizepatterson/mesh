var				   canvas = document.querySelector('canvas'),
					  ctx = canvas.getContext("2d"),
	stimulationInProgress = false,	// False or the timer ID of the stimulation in progress
		  drawingDendrite = false,
		  highlightedCell = -1,
			 selectedCell = -1,
					Cells = [],
				Dendrites = [],
				   Pulses = [],
			dendriteLimit = 20,
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
			   curveWidth = 30,
				fireCount = 0;
		 stimulationCount = 0;

function distance(x1, y1, x2, y2) {
	// Use the distance formula to calculate the distance between two points.
	return Math.sqrt( Math.pow( (x2-x1), 2 ) + Math.pow( (y2-y1), 2 ) );
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
function Cell(x, y, r, threshold, firePower) {
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
	this.TimerCollection = new TimerCollection();	// An array of any and all animation timers associated with this cell
	this.firing = false;		// Whether the cell is currently firing.
	this.refactoryPeriod = 250;

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
		// Draw the wedge
		if (this.potential > 0 && this.potential < this.threshold) {
			var wedgeAngle = (1.5 * Math.PI) + (this.potential / this.threshold * 2 * Math.PI);	// 1.5*PI starts us at the top of the circle. Dang radians.
			ctx.beginPath();
			ctx.fillStyle = this.selected ? backgroundColor : wedgeColor;
			ctx.moveTo(this.x, this.y);
			ctx.arc(this.x, this.y, this.r * 0.75, 1.5 * Math.PI, wedgeAngle);
			ctx.fill();
			ctx.closePath();

			// this.drawPotentialWedge(false, 0, this.potential / this.threshold);
		}
		if (this.firing) {
			ctx.beginPath();
			ctx.fillStyle = '#ffc107';
			ctx.arc(this.x, this.y, this.r * 0.75, 0, 2 * Math.PI);
			ctx.fill();
			ctx.closePath();
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
				ctx.beginPath();
				ctx.fillStyle = fillStyle;
				ctx.moveTo(this.x, this.y);
				ctx.arc(this.x, this.y, this.r*0.75, 1.5*Math.PI, start);
				ctx.fill();
			}
			// Animate the drawing of the wedge that represents accumulated potential
			var progress = start;
			var cell = this;	// In the context of setInterval, 'this' refers to the window object, so copy the current this
			var wedgeAnimation = window.setInterval(function() {
						// Update target in case the cell has been stimulated since this animation began
						var newTarget = cell.potential / cell.threshold;
						if (progress < Target) {
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
							// printMeshStateTable(cellSnapshot);
						}
						progress = progress + 10*Math.PI / 180; // Increment by 10-degree intervals (Screw radians!)
				}, 10);
			this.TimerCollection.wedgeAnimation = wedgeAnimation;
		} else {
			// Draw without animating
			ctx.beginPath();
			ctx.fillStyle = fillStyle;
			ctx.moveTo(this.x, this.y);
			ctx.arc(this.x, this.y, this.r*0.75, 1.5*Math.PI, target);
			ctx.fill();
			if (newPotentialRatio >= 1) {
				this.fire(stimulateChildren);
			}
			var cellSnapshot = cell;
			// printMeshStateTable(cellSnapshot);
		}		
	}

	this.fire = function () {
		// If we're already in the middle of firing, then do nothing
		if (this.firing) {
			return;
		}
		// Complete the wedge-circle, stimulate children, and reset after a refactory period
		this.firing = true;
		fireCount++;
		updateStatisticsTable();

		var parentCell = this;
		var fn = function () {
			parentCell.potential = 0;
			parentCell.firing = false;
			// parentCell.TimerCollection.fireAnimation = 0;
			if (parentCell.outputDendrites.length > 0) {
				var power = parentCell.firePower;
				for (let i = 0; i < parentCell.outputDendrites.length; i++) {
					// Delay for a time proportional to the length of the dendrite
					let childCell = parentCell.outputDendrites[i].destinationCell;
					let delay = parentCell.outputDendrites[i].length;
					let childfn = function () {
						// childCell.TimerCollection.stimulateChildDelay = 0;
						childCell.stimulate(power);
					}
					// this.TimerCollection.stimulateChildDelay = setTimeout(childfn, delay);
					window.setTimeout(childfn, delay);
				}
			}
			updateCellInfoTable(parentCell.id, 'potential', parentCell.potential);
		};
		// this.TimerCollection.fireAnimation = window.setTimeout(fn, 250);
		window.setTimeout(fn, parentCell.refactoryPeriod);
	}

	this.highlight = function () {
		highlightedCell = this.id;
		this.highlighted = true;
		document.getElementById("cellInfo").innerHTML = "Current Potential: " + this.potential + "; Threshold: " + this.threshold + "; Power: "+this.firePower;
		// document.getElementById('cellRow'+this.id).style.border = highlightWidth+'px solid '+highlightColor;
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
		document.getElementById("cellInfo").innerHTML = "";
		// document.getElementById('cellRow'+this.id).style.border = 'initial';
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
	}

	this.unselect = function () {
		// Set selected flags
		selectedCell = -1;
		this.selected = false;
		drawingDendrite = false;
		var row = document.getElementById('cellRow'+this.id);
		for (let i = 0; i < row.children.length; i++) {
			row.children[i].style.color = 'initial';
			row.children[i].style.backgroundColor = 'initial';
		}
	}

	this.stimulate = function (power) {
		var newPotential = this.potential + power;
		newPotential = (newPotential > this.threshold) ? this.threshold : newPotential;
		this.potential = newPotential;
		stimulationCount++;
		updateStatisticsTable();
  		updateCellInfoTable(this.id, 'potential', this.potential);
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
	this.color = dendriteColor;
	this.lineWidth = 0.5;

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
		// Calculate (if needed) the coordinates for the control point needed for drawing this dendrite curve
		// Uses global curveWidth variable
		// Returns the coordinates in an array [x, y];
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

	this.draw = function (ignoreLoop = false) {
	    ctx.beginPath();
	    ctx.strokeStyle = this.color;
	    ctx.lineWidth = this.lineWidth;
		// If this dendrite creates a feedback loop with another cell, then curve the dendrite lines
		var loop = false;
		// Iterate through the origin cell's input dendrites and see if any come from the current destination cell
		if (this.originCell != null) {
			for (let i = 0; i < this.originCell.inputDendrites.length; i++) {
				if (this.originCell.inputDendrites[i].originCell == null) {
					continue;
				}
				if (this.originCell.inputDendrites[i].originCell.id === this.destinationCell.id) {
					loop = true;
					break;
				}
			}
		}	
		if (loop && !ignoreLoop && this.getControlPoint()) {
			ctx.beginPath();
			// ctx.strokeStyle = color;
			// ctx.lineWidth = width;
			ctx.moveTo(this.startX, this.startY);
			ctx.quadraticCurveTo(this.controlPoint[0], this.controlPoint[1], this.endX, this.endY);
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
		    	// ctx.strokeStyle = this.color;
		    	ctx.moveTo(this.arrowCoords[0], this.arrowCoords[1]);
		    	ctx.lineTo(Math.round(this.midpointX), Math.round(this.midpointY));
		    	ctx.lineTo(this.arrowCoords[2], this.arrowCoords[3]);
		    	ctx.stroke();
		    	ctx.closePath();
		    }
		}
	}
}

function clearWorkspace() {
	resetWorkspace();
	// Clear out arrays
	Cells = [];
	Dendrites = [];
	init();
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
		Cells[i].firing = false;
		Cells[i].unselect();
		Cells[i].unhighlight();

	}
	fireCount = 0;
	stimulationCount = 0;
	document.getElementById("tip").innerHTML = '';
}

function workspaceMouseClick(event) {
	var x = event.clientX - canvas.offsetLeft + window.pageXOffset;
	var y = event.clientY - canvas.offsetTop + window.pageYOffset;
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
	var x = event.clientX - canvas.offsetLeft + window.pageXOffset;
    var y = event.clientY - canvas.offsetTop + window.pageYOffset;
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
		Cells[highlightedCell].unhighlight;
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
	newDen.draw(dendriteColor, 0.5);
	updateCellInfoTable();
	updateStatisticsTable();
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
	updateCellInfoTable();
	updateStatisticsTable();
	if (initialHighlight) {
		newCell.highlight();
	}
	return newCell;
}
 
function updateCellInfoTable(cellid = null, property = null, value = null) {
	var tbody = document.getElementById("cellInfoTable").getElementsByTagName('tbody')[0];
	if (cellid == null && property == null && value == null) {
		// Update the whole table. Delete the rows in the cell info table; then add them back.
		var rowCount = tbody.rows.length;	// Copy this so it doesn't change as you loop through and delete the rows one at a time
		for (var j = 0; j < rowCount; j++) {
			tbody.deleteRow(0);	// Careful. Must pass 0 for each loop, because as one row is deleted, the others move up.
		}
		for (let i = 0; i < Cells.length; i++) {
			let cell = Cells[i];
			let row = tbody.insertRow(i);
			row.id = "cellRow"+i;
			row.addEventListener('mouseover', function() { cell.highlight(); });
			row.addEventListener('mouseout', function() { cell.unhighlight(); });
			row.addEventListener('click', function() { cell.toggleSelect(); });
			row.insertCell(0).innerHTML = cell.id+1;
			row.insertCell(1).innerHTML = "("+cell.x+", "+cell.y+")";
			row.insertCell(2).innerHTML = cell.potential;
			row.insertCell(3).innerHTML = cell.threshold;
			row.insertCell(4).innerHTML = cell.firePower;
			row.insertCell(5).innerHTML = cell.inputDendrites.length;
			row.insertCell(6).innerHTML = cell.outputDendrites.length;
		}
	} else if (cellid == null || property == null || value == null) {
		console.log('Missing argument in updateCellInfoTable().');
		return;		
	} else {
		// Update the given property of the given cell
		var row = document.getElementById("cellRow"+cellid);
		switch (property) {
			case 'potential': row.children[2].innerHTML = value; break;
			case 'threshold': row.children[3].innerHTML = value; break;
			case 'firePower': row.children[4].innerHTML = value; break;
			case 'input'	: row.children[5].innerHTML = value; break;
			case 'output'	: row.children[6].innerHTML = value; break;
			default 		: console.log('Unrecognized property passed to updateCellInfoTable().');
		}
	}	
}

function updateStatisticsTable() {
	document.getElementById("totalCells").innerHTML = Cells.length;
	document.getElementById("totalDendrites").innerHTML = Dendrites.length;
	document.getElementById("totalFires").innerHTML = fireCount;
	document.getElementById("totalStimulations").innerHTML = stimulationCount;
}

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ) {
            window.setTimeout(callback, 1000 / 60);
          };
})();

function draw() {
	ctx.clearRect(0, 0, 500, 500);
	// Draw all dendrites
	for (let d = 0; d < Dendrites.length; d++) {
		Dendrites[d].draw();
	}
	// Draw all cells
	for (let c = 0; c < Cells.length; c++) {
		Cells[c].draw();
		if (Cells[c].potential === Cells[c].threshold) {
			Cells[c].fire();
		} else {
			Cells[c].drawWedge;
		}
	}

}

function init() {
	canvas.width = 500;
	canvas.height = 500;
	// Add event listeners
	canvas.addEventListener("click", workspaceMouseClick);
	canvas.addEventListener("mousemove", workspaceMove);
	canvas.addEventListener("mouseout", workspaceMoveOut);
	document.getElementById("startStimulate").addEventListener("click", clickStimulateButton);
	document.getElementById("stopStimulate").addEventListener("click", stopStimulate);
	document.getElementById("stepStimulate").addEventListener("click", function() { Cells[0].stimulate(1); });
	document.getElementById("resetWorkspace").addEventListener("click", resetWorkspace);
	document.getElementById("clearWorkspace").addEventListener("click", clearWorkspace);
	document.getElementById("thresholdSetting").addEventListener("change", updateThresholdValue);
	document.getElementById("thresholdSetting").addEventListener("mousemove", updateThresholdValue);
	document.getElementById("firepowerSetting").addEventListener("change", updateFirepowerValue);
	document.getElementById("firepowerSetting").addEventListener("mousemove", updateFirepowerValue);

	// Initial setup of the workspace includes one cell and one dendrite
	var firstCell = addCell(75, 250, 20, 1, 1, false, ctx);
	firstCell.drawPotentialWedge(false, null, firstCell.potential / firstCell.threshold);
	// Create the first dendrite, which is a special case: it doesn't have an origin cell
	// because the first cell is stimulated by clicking the "start" or "step" button.
	addDendrite(null, firstCell, 0, firstCell.y, firstCell.x-firstCell.r, firstCell.y);
	updateStatisticsTable();
  	updateCellInfoTable();
  	loop();
};

function loop() {
  watch();
  draw();
  requestAnimFrame(loop);
};

init();