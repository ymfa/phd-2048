function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  this.startTiles     = 2;
  this.relDuration    = 10; // Duration (sec) of a relationship

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(true); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(false); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
    this.maxTile     = previousState.maxTile || 4;
    this.garbCount   = previousState.garbCount || 0;
    this.karma       = previousState.karma || 0;
    this.relTime     = previousState.relTime || null;
    if(this.relTime){
      if((new Date().getTime()-this.relTime)/1000 > this.relDuration){
        this.relTime = null;
        if(this.karma <= 0){
          var changes = this.grid.clearRelationship(true);
          this.garbCount += changes;
        }
      }
      else
        this.setTimer();
    }
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;
    this.maxTile     = 4;
    this.garbCount   = 0;
    this.karma       = 0;
    this.relTime     = null;

    // Add the initial tiles
    this.addStartTiles();
    //window.history.pushState("new-game", "", ".");
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  var numCellsAvailable = this.grid.availableCells().length;
  if (numCellsAvailable > 0) {
    var coin = Math.random();
    var p = 0.003;
    if(this.maxTile >= 1024) p = 0.001;
    else if(this.maxTile >= 256) p = 0.002;
    var value = coin < 0.9 ? 2 : 4;
    if(this.karma == 0 && this.relTime == null && numCellsAvailable > 1 && numCellsAvailable < 10 && coin >= 0.9-9*p && coin < 0.9+p){
      value = 1;
      this.relTime = new Date().getTime();
      this.setTimer();
    }
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying,
    maxTile:     this.maxTile,
    garbCount:   this.garbCount,
    karma:       this.karma,
    relTime:     this.relTime
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        if (tile.value == 0) {  // Sticky garbage
          var lazyPosition = self.averagePosition(positions.farthest, cell);
          if (!self.positionsEqual(lazyPosition, positions.farthest)) {
            positions.farthest = lazyPosition;
            next = null;
          }
        }

        if (tile.value == 1 && next) {
          self.moveTile(tile, positions.farthest);
          if (self.relTime) {
            if (next.benefitedFrom != self.relTime) {
              next.value *= 2;
              if (next.value > self.maxTile) self.maxTile = next.value;
              if (next.value >= 2048) self.won = true;
              next.benefitedFrom = self.relTime;
              self.karma++;
              moved = true;
            }
          }
          else {
            if (next.value >= 4){
              next.value /= 2;
              self.karma--;
              if (self.karma <= 0) self.grid.clearRelationship(false);
              moved = true;
            }
          }
        }
        else if (next && next.value === tile.value && !next.mergedFrom) {
          if(next.value != 0) {
            if((self.maxTile < 256 || self.garbCount % 2 > 0)
              && ((next.value == 8 && Math.random() >= 0.8)
              || (next.value == 128 && Math.random() >= 0.85))) {
              var merged = new Tile(positions.next, 0);
              self.garbCount++;
            }
            else {
              var merged = new Tile(positions.next, tile.value * 2);
              merged.benefitedFrom = tile.benefitedFrom;
              if(next.benefitedFrom > merged.benefitedFrom) merged.benefitedFrom = next.benefitedFrom;
            }
            merged.mergedFrom = [tile, next];
            self.grid.insertTile(merged);
            self.score += merged.value;
            if (merged.value > self.maxTile) self.maxTile = merged.value;
            if (merged.value === 2048) self.won = true;
          }
          else {
            self.grid.removeTile(next);
            self.garbCount -= 2;
          }

          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);
        }
        else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};

GameManager.prototype.averagePosition = function (first, second) {
  var x = (first.x + second.x) / 2;
  var y = (first.y + second.y) / 2;
  if (x%1 != 0) x = Math.random()<x%1 ? Math.ceil(x) : Math.floor(x);
  if (y%1 != 0) y = Math.random()<y%1 ? Math.ceil(y) : Math.floor(y);
  return { x: x, y: y };
};

GameManager.prototype.setTimer = function () {
  var self = this;
  this.timer = setInterval(function(){
    var elapsed = (new Date().getTime() - self.relTime) / 1000;
    if(elapsed >= self.relDuration){
      self.unsetTimer();
      self.actuator.refreshRel(0);
    }
    else{
      self.actuator.refreshRel(Math.round(self.relDuration - elapsed));
    }
  }, 1000);
};

GameManager.prototype.unsetTimer = function () {
  this.relTime = null;
  if(this.timer){
    clearInterval(this.timer);
    delete this.timer;
  }
  if(this.karma <= 0){
    var changes = this.grid.clearRelationship(true);
    if(changes){
      this.garbCount += changes;
      this.actuate();
    }
  }
};
