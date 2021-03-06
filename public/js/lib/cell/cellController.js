// High-level cell controller in charge of manipulating,
// moving, creating, destroying/etc. cells.
function CellController(game) {
	this.game = game;
	// Get all cells currently at play in the game
	this.getAllCells = function() {
		var allCells = [];
		for (var i = 0; i < this.game.broods.length; i++) {
			allCells = allCells.concat(this.game.broods[i].cells);
		}
		return allCells;
	}
	// Returns an object containing the broods as keys
	// and the number of cells they have as colors
	this.getCellDistribution = function() {
		var cellDistributions = [];
		for (var i = 0; i < this.game.broods.length; i++) {
			var obj = {};
			cellDistributions.push({
				brood: this.game.broods[i].color,
				count: this.game.broods[i].cells.length
			});
		}
		return cellDistributions;
	};
	// Execute a turn, iterating through each individual cell.
	// If "interval" is passed, we iterate through the cells
	// one at a time, and then call a final callback.
	this.turn = function(interval, callback) {
		var me = this;
		// Reset turns on cells anew
		var allCells = _.shuffle(this.getAllCells());
		for (var i = 0; i < allCells.length; i++) {
			allCells[i].moved = false;
			if (interval) {
				(function(i) {
					setTimeout(function() {
						// Remove any broods that don't exist anymore
						var distributions = me.game.cellController.getCellDistribution();
						for (var j = 0; j < distributions.length; j++) {
							if (distributions[j].count == 0) {
								me.game.controller.removeBrood(distributions[j].brood);
							}
						}
						me.cellTurn(allCells[i]);
						me.game.ui.renderBroodSquares(distributions);
						me.game.artist.draw();
					});
				})(i);
			} else {
				this.cellTurn(allCells[i]);
			}
		}
		if (interval) {
			setTimeout(callback, i * interval)
		}
	};
	// Take a turn for the cell. Check if we've been conquered, if we
	// (have to) win a fight, divide or move into a random unoccupied Space.
	this.cellTurn = function(cell) {
		// Get this cell's surroundings
		var surroundings = cell.getSurroundingCells();

		// Check for conquer scenario
		var conquered = this.cellConquered(cell, surroundings);
		if (conquered.result) {
			var brood = this.game.controller.getBrood(conquered.conquerorColor);
			cell.setBrood(brood);
			cell.moved = true;
			return;
		}

		// Act on fight scenario
		var fight = this.cellFight(cell, surroundings);
		if (fight.result) {
			if (fight.winner == cell) {
				fight.loser.setBrood(cell.brood);
			} else {
				cell.setBrood(fight.winner.brood);
			}
			fight.loser.moved = true;
			fight.winner.moved = true;
			return;
		}

		// Move or divide
		var randomUnoccupied = cell.getRandomUnoccupiedNeighbor();
		if (randomUnoccupied) {
			// Coin toss to move or reproduce into empty space
			if (randomInt(2) == 0) {
				// Create a cell with our brood in the random
				// unoccupied space and also specify that its
				// move is up
				this.createCell(cell.brood, randomUnoccupied, true);
			} else {
				this.moveCell(cell, randomUnoccupied);
			}
		}

		cell.moved = true;
	};
	// Checks whether or not a cell is conquered by its neighbours
	// by getting the surrounding cells and accumulating the count
	// of enemy broods. If it's 3 or more, this cell has been defeated.
	this.cellConquered = function(cell, surroundings) {
		var conquered = {
			result: false
		};
		for (var i in surroundings.broods) {
			if (surroundings.broods[i] >= 3) {
				conquered.result = true;
				conquered.conquerorColor = i;
			}
		}
		return conquered;
	};
	this.cellFight = function(cell, surroundings) {
		var fight = {
			result: false
		};

		// Grab all the nearby enemy cells
		var opponentCells = [];
		for (var j in surroundings.cells) {
			if (surroundings.cells[j].brood !== cell.brood) {
				opponentCells.push(surroundings.cells[j]);
			}
		}

		// Grab one random enemy cell
		var opponentCell;
		if (opponentCells.length > 0) {
			// Yup, this is a fight!
			fight.result = true;
			var rand = randomInt(opponentCells.length);
			opponentCell = opponentCells[rand];
		}

		// Coin flip to win
		var thisCellWins = randomInt(2) == 0;
		if (thisCellWins) {
			fight.winner = cell;
			fight.loser  = opponentCell;
		} else {
			fight.winner = opponentCell;
			fight.loser  = cell;
		}
		return fight;
	};
	this.moveCell = function(cell, space) {
		// Detach from current space
		cell.space.setCell(null);
		// and in the darkness, bind them
		space.setCell(cell);
		cell.setSpace(space);
		cell.moved = true;
	};
	// Tell a Brood to create a cell
	this.createCell = function(brood, space, moved) {
		var cell = new Cell(
			this.game,
			brood,
			space,
			moved
		);
		brood.ownCell(cell);
		space.setCell(cell);
	};
}