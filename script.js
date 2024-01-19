document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById('yinshBoard');
    const ctx = canvas.getContext('2d');

    // Assuming the canvas is square and its size is based on the smallest viewport dimension
    const canvasSize = Math.min(window.innerWidth, window.innerHeight) * 0.7;
    const margin = canvasSize * 0.05; // 5% margin, for example
    const gridSize = canvasSize - margin * 2; // Total grid size after subtracting margins
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    // The vertical and horizontal spacings now need to account for the margin
    const verticalSpacing = gridSize / 19;
    const horizontalSpacing = gridSize / 11;
    // Adjust the radius relative to cell size
    const radius = Math.min(verticalSpacing, horizontalSpacing) * 0.1;

    const gameBoard = new GameBoard(ctx, gridSize, margin);

    let rings = []; // Stores the positions of all placed rings
    let turnCount = 1; // Initialize turn counter
    let hoverPos = null; // Stores the position of the hover effect
    let selectedRing = null; // Stores the position of the selected ring
    let possibleMoves = []; // Stores the possible moves for the current turn

    let markerCount = 0;
    let markers = []; // Stores the positions of all markers
    let markerSequences = []; // Stores the sequences of 5 in a row
    let clickableMarkers = []

    let score = { white: 0, black: 0 };
    let outcome = '';
    let gameState = 'placingRings'; // Can be 'placingRings', 'selectingSequence', 'movingRing', or 'removingRing'
    let gameOver = false;
    let history = []; // Stores past game states
    let future = []; // Stores undone game states for redo

    let selectSequence = false;
    let selectSequenceAtStart = false;
    window.toggleBot = toggleBot;

    function drawGrid() {
        gameBoard.draw(rings, markers, possibleMoves, clickableMarkers);

        if (gameState === 'removingRing') {
            gameBoard.drawRingsForRemoval(rings, (turnCount % 2 !== 0) ? 1 : -1);
        }

        drawRemovedRings();

        if (hoverPos) {
            let ringNumberAtHover = internalBoard[hoverPos.row][hoverPos.col];
            let isTurnWhite = turnCount % 2 !== 0;
            let isTurnBlack = turnCount % 2 === 0;
            let isPlayerRing = (isTurnWhite && ringNumberAtHover > 0) || (isTurnBlack && ringNumberAtHover < 0);
            // Drawing hovering effect during ring placement stage
            if (ringNumberAtHover === 0 && turnCount < 11) {
                gameBoard.drawRing(hoverPos.x, hoverPos.y, turnCount % 2 !== 0 ? 2 : -2);
            } else if (ringNumberAtHover !== 0 && turnCount >= 11 && isPlayerRing){ // Drawing hovering effect for markers
                drawHoverMarker(hoverPos.x, hoverPos.y);
            }
        }
    }

    // Draw Marker for Hover Effect
    function drawHoverMarker(mouseX, mouseY) {
        let isTurnBlack = turnCount % 2 === 0;

        // Gradient for a 3D effect on the hover marker
        let startGradientColor = isTurnBlack ? 'black' : '#E2E2E2'; // Lighter for white, darker for black
        let endGradientColor = isTurnBlack ? '#212121' : 'white';
        let gradient = ctx.createRadialGradient(mouseX, mouseY, radius, mouseX, mouseY, 6 * radius);
        gradient.addColorStop(0, startGradientColor);
        gradient.addColorStop(1, endGradientColor);

        // Draw the hover marker with gradient fill
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 6 * radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw the thin blue border
        ctx.strokeStyle = '#004995'; // Blue color for the border
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function isWithinCircle(mouseX, mouseY, circleX, circleY, radius) {
        const dx = mouseX - circleX;
        const dy = mouseY - circleY;
        return dx * dx + dy * dy <= radius * radius * 30;
    }

    // Update the hover effect based on the mouse position
    function updateHoverEffect(mouseX, mouseY) {
        hoverPos = null; // Reset hoverPos

        // Check against the BOARD_TEMPLATE
        BOARD_TEMPLATE.forEach((columns, row) => {
            columns.forEach(column => {
                // Calculate the center x and y position based on horizontalSpacing and verticalSpacing
                let cx = column * horizontalSpacing + horizontalSpacing / 2 + margin;
                let cy = row * verticalSpacing + verticalSpacing / 2 + margin;

                if (isWithinCircle(mouseX, mouseY, cx, cy, radius)) {
                    // Check if the position corresponds to the current player's ring
                    hoverPos = { x: cx, y: cy, row: row, col: column };
                    if (hoverPos) {
                        // If there is a hover position, draw the hover marker
                        drawHoverMarker(hoverPos.x, hoverPos.y); // Pass true for isHovering
                    }
                }
            });
        });

        drawGrid(); // Redraw the grid
    }

    // Function to add a ring to the internal board representation
    function addRingToBoard(row, col) {
        let ringNumber = turnCount % 2 !== 0 ? 2 : -2;

        // Check if it's within the first ten turns and the selected spot is empty
        if (turnCount < 11 && internalBoard[row] && internalBoard[row][col] === 0) {
            saveState();
            document.getElementById('undoButton').disabled = false;
            internalBoard[row][col] = ringNumber;
            rings.push({ x: col * horizontalSpacing + horizontalSpacing / 2 + margin, y: row * verticalSpacing + verticalSpacing / 2 + margin, number: ringNumber});
            turnCount++; // Increment turn count
            updateTurnDisplay(); // Update the turn display
            gameBoard.drawRings(rings);
            drawGrid();
            playPiecePlacedSound();
        } else{
            console.log("All rings placed. No further placement allowed.");
        }

        if (botEnabled && turnCount % 2 !== 0) {
            setTimeout(makeBotMove, 500); // Delay to simulate thinking time
        }
    }

    function selectRing(row, col) {
        let ringValue = internalBoard[row][col];
        let isTurnWhite = turnCount % 2 !== 0;
        let isTurnBlack = turnCount % 2 === 0;

        let isPlayerWhiteRing = isTurnWhite && ringValue === 2;
        let isPlayerBlackRing = isTurnBlack && ringValue === -2;

        // Check if this ring is already selected
        if (selectedRing) {
            console.log("This ring is already selected.");
            return; // Exit the function if the same ring is clicked again
        }

        if ((isPlayerWhiteRing || isPlayerBlackRing) && turnCount > 10) {
            selectedRing = { row, col };
            getPossibleMoves(row, col);
            if (possibleMoves.length === 0) {
                console.log("No possible moves for this ring.");
            } else {
                document.getElementById('undoButton').disabled = true;
                saveState();
                // Place a marker at the original ring position
                let markerPosition = {
                    x: col * horizontalSpacing + horizontalSpacing / 2 + margin,
                    y: row * verticalSpacing + verticalSpacing / 2 + margin,
                    row: row,
                    col: col,
                    color: turnCount % 2 !== 0 ? 1 : -1
                };
                markers.push(markerPosition);
                markerCount++;
                updateMarkerDisplay();
                playPiecePlacedSound();
            }
        }
        drawGrid();
    }

    function getPossibleMoves(row, col) {
        possibleMoves = [];

        // Function to add moves from a given list if it contains the selected ring
        function addMovesFromList(list, startRow, startCol) {
            list.forEach(path => {
                if (path.some(point => point[0] === startRow && point[1] === startCol)) {
                    let startIndex = path.findIndex(point => point[0] === startRow && point[1] === startCol);

                    // Check in the direction of increasing indices
                    checkDirection(path, startIndex, 1); // 1 for forward direction

                    // Check in the direction of decreasing indices
                    checkDirection(path, startIndex, -1); // -1 for backward direction
                }
            });
        }

        function checkDirection(path, startIndex, direction) {
            let jumpedOverMarker = false;
            for (let i = startIndex + direction; i >= 0 && i < path.length; i += direction) {
                let point = path[i];
                const pointValue = internalBoard[point[0]][point[1]];
                // Check for ring blocking the path
                if (pointValue > 1 || pointValue < -1) {
                    return;
                } else if (pointValue === 0 && jumpedOverMarker) {
                    possibleMoves.push(point);
                    return; // Stop after the first valid move
                } else if (pointValue === 1 || pointValue === -1) {
                    jumpedOverMarker = true;
                } else if (pointValue === 0) {
                    possibleMoves.push(point);
                }
            }
        }
        // Check vertical, diagonal, and anti-diagonal lists
        addMovesFromList(verticalLists, row, col);
        addMovesFromList(diagonalLists, row, col);
        addMovesFromList(antiDiagonalLists, row, col);
    }

    function flipMarkersAlongPath(startRow, startCol, endRow, endCol) {
        const allPaths = verticalLists.concat(diagonalLists, antiDiagonalLists);

        allPaths.forEach(path => {
            if (path.some(point => point[0] === startRow && point[1] === startCol) &&
                path.some(point => point[0] === endRow && point[1] === endCol)) {

                let startIndex = path.findIndex(point => point[0] === startRow && point[1] === startCol);
                let endIndex = path.findIndex(point => point[0] === endRow && point[1] === endCol);

                if (startIndex > endIndex) {
                    [startIndex, endIndex] = [endIndex, startIndex]; // Swap if start is greater than end
                }

                for (let i = startIndex + 1; i < endIndex; i++) {
                    let [row, col] = path[i];
                    if (internalBoard[row][col] === 1 || internalBoard[row][col] === -1) {
                        internalBoard[row][col] *= -1; // Flip the marker
                        // Update marker color in the markers array
                        let markerIndex = markers.findIndex(marker => marker.x === col * horizontalSpacing + horizontalSpacing / 2 + margin && marker.y === row * verticalSpacing + verticalSpacing / 2 + margin);
                        if (markerIndex !== -1) {
                            markers[markerIndex].color = internalBoard[row][col] === 1 ? 1 : -1;
                        }
                    }
                }
            }
        });
    }

    function animateRingMove(startX, startY, endX, endY, ringNumber, callback) {
        const animationDuration = 250; // Duration in milliseconds
        const startTime = Date.now();

        function drawFrame() {
            let currentTime = Date.now();
            let progress = Math.min((currentTime - startTime) / animationDuration, 1);

            let currentX = startX + (endX - startX) * progress;
            let currentY = startY + (endY - startY) * progress;

            // Clear the canvas and redraw everything except the moving ring
            drawGrid(); // You may need to modify drawGrid to optionally exclude the moving ring

            // Draw the moving ring at its current position
            gameBoard.drawRing(currentX, currentY, ringNumber);

            if (progress < 1) {
                window.requestAnimationFrame(drawFrame);
            } else {
                callback(); // Call the callback function once the animation is complete
            }
        }

        drawFrame();
    }

    function moveRing(newRow, newCol) {
        if (!possibleMoves.some(point => point[0] === newRow && point[1] === newCol)) {
            console.log("Invalid move");
            return;
        }

        let ringNumber = turnCount % 2 !== 0 ? 2 : -2;
        // Place a marker at the ring.
        internalBoard[selectedRing.row][selectedRing.col] = turnCount % 2 !== 0 ? 1 : -1;
        let pickedRing = rings.findIndex(ring => ring.x === selectedRing.col * horizontalSpacing + horizontalSpacing / 2 + margin && ring.y === selectedRing.row * verticalSpacing + verticalSpacing / 2 + margin);
        if (pickedRing !== -1) {
            rings.splice(pickedRing, 1);
        }

        let startX = selectedRing.col * horizontalSpacing + horizontalSpacing / 2 + margin;
        let startY = selectedRing.row * verticalSpacing + verticalSpacing / 2 + margin;
        let endX = newCol * horizontalSpacing + horizontalSpacing / 2 + margin;
        let endY = newRow * verticalSpacing + verticalSpacing / 2 + margin;

       animateRingMove(startX, startY, endX, endY, ringNumber, function() {
           internalBoard[newRow][newCol] = ringNumber;
           rings.push({
               x: newCol * horizontalSpacing + horizontalSpacing / 2 + margin,
               y: newRow * verticalSpacing + verticalSpacing / 2 + margin,
               number: ringNumber
           });
           flipMarkersAlongPath(selectedRing.row, selectedRing.col, newRow, newCol);

           let currentPlayer = (turnCount % 2 !== 0) ? 1 : -1;
           // Check if there are sequences to remove
           if (hasSequencesToRemove((currentPlayer))) {
               selectSequence = true;
               gameState = 'selectingSequence';
               if (botEnabled && turnCount % 2 !== 0) {
                removeMarkerSequence(clickableMarkers[0].row, clickableMarkers[0].col);
                removeRingIfClicked(newRow, newCol);
            }
           } else if (hasSequencesToRemove(-currentPlayer)) {
               gameState = 'removingSequenceAtStart';
               turnCount++;
               updateTurnDisplay();
               if (botEnabled && turnCount % 2 !== 0) {
                    checkForMarkerSequences(1);
                    removeMarkerSequence(clickableMarkers[0].row, clickableMarkers[0].col);
                    let ringWithNumberTwo = rings.find(ring => ring.number > 0);
                    removeRingIfClicked(ringWithNumberTwo.col, ringWithNumberTwo.row);
                    turnCount--;
                    updateTurnDisplay();
                    gameState = 'movingRing';
                    if (!gameOver){
                        makeBotMove();
                    }
                }
           } else {
               // Only increment turnCount if there are no sequences to remove
               turnCount++;
               updateTurnDisplay();
           }

           selectSequenceAtStart = false;
           selectedRing = null;
           possibleMoves = [];

           updateTurnDisplay();

           gameBoard.drawRings(rings);
           gameBoard.drawMarkers(markers);
           playPiecePlacedSound();

           document.getElementById('undoButton').disabled = false;

           if (markers.length === 51) {
               if (score.white > score.black) {
                   outcome = 'Outcome: White wins. All 51 markers are used up.';
               } else if (score.black > score.white) {
                   outcome = 'Outcome: Black wins. All 51 markers are used up.';
               } else {
                   outcome = 'Outcome: A Tie. All 51 markers are used up.';
               }
               updateOutcomeDisplay();
               gameOver = true;
           }

           drawGrid();

           if (botEnabled && turnCount % 2 !== 0) {
                setTimeout(makeBotMove, 500); // Delay to simulate thinking time
            }
       });
    }

    function hasSequencesToRemove(currentPlayerColor) {
        checkForMarkerSequences(currentPlayerColor);
        return markerSequences.some(sequence =>
            sequence.length >= 5 && sequence[0].color === currentPlayerColor
        );
    }

    function checkForMarkerSequences(currentPlayerColor) {
        markerSequences = []; // Reset previous sequences
        const allPaths = [...verticalLists, ...diagonalLists, ...antiDiagonalLists];

        // Check for sequences of 5 in a row and add them to markerSequences
        allPaths.forEach(path => {
            let currentSequence = [];
            let lastMarker = null;

            path.forEach(([row, col]) => {
                const marker = internalBoard[row][col];
                if (marker === currentPlayerColor) {
                    if (marker === lastMarker) {
                        currentSequence.push({ row, col, color: marker === 1 ? 1 : -1});
                    } else {
                        if (currentSequence.length >= 5) {
                            markerSequences.push([...currentSequence]);
                        }
                        currentSequence = [{ row, col, color: marker === 1 ? 1 : -1}];
                    }
                    lastMarker = marker;
                } else {
                    if (currentSequence.length >= 5) {
                        markerSequences.push([...currentSequence]);
                    }
                    currentSequence = [];
                    lastMarker = null;
                }
            });

            // Check at the end of the path
            if (currentSequence.length >= 5) {
                markerSequences.push([...currentSequence]);
            }
        });
        populateClickableMarkers();
    }

    function populateClickableMarkers() {
        // let allMarkers = new Map(); // To track the counts of each marker
        // console.log(markerSequences);
        // // After populating markerSequences, identify unique markers
        // markerSequences.forEach(sequence => {
        //     sequence.forEach(marker => {
        //         const key = `${marker.row}-${marker.col}`;
        //         if (allMarkers.has(key)) {
        //             allMarkers.get(key).count += 1;
        //         } else {
        //             allMarkers.set(key, { ...marker, count: 1 });
        //         }
        //     });
        // });


        // // Now populate clickableMarkers with markers that have a count of 1
        // clickableMarkers = [];
        // allMarkers.forEach((value, key) => {
        //     if (value.count === 1) {
        //         clickableMarkers.push({ row: value.row, col: value.col, color: value.color });
        //     }
        // });

        let currentPlayerColor = (turnCount % 2 !== 0) ? 1 : -1;

        markerSequences.forEach(sequence => {
            let len = sequence.length;
            let startIndex, endIndex;
            startIndex = 2;
            endIndex = len - 3;
            // Ensure the indices are within bounds and add them to clickableMarkers
            for (let i = startIndex; i <= endIndex && i < len; i++) {
                if (i >= 0 && sequence[i].color === currentPlayerColor) {
                    clickableMarkers.push(sequence[i]);
                }
            }
        });

        console.log(clickableMarkers);
    }

    // Function to remove sequence of markers
    function removeMarkerSequence(row, col) {
        console.log(row + ", " + col);
        // Find the sequence that contains the clicked marker
        let sequenceToRemove = markerSequences.find(sequence =>
            sequence.some(marker => marker.row === row && marker.col === col)
        );

        // Remove markers from the sequence
        if (sequenceToRemove) {
            let clickedIndex = sequenceToRemove.findIndex(marker => marker.row === row && marker.col === col);
            let startIndex = Math.max(clickedIndex - 2, 0);
            let endIndex = Math.min(clickedIndex + 2, sequenceToRemove.length - 1);

            for (let i = startIndex; i <= endIndex; i++) {
                let marker = sequenceToRemove[i];
                internalBoard[marker.row][marker.col] = 0; // Remove marker from board
                markers = markers.filter(m => !(m.row === marker.row && m.col === marker.col));

            }
            markerCount -= 5;
            updateMarkerDisplay();

            clickableMarkers = []; // Clear the clickable markers
            selectSequence = false;
            drawGrid(); // Redraw the grid
        }
    }

    function removeRingIfClicked(row, col) {
        // Convert row and column indices into canvas coordinates
        let clickedX = col * horizontalSpacing + horizontalSpacing / 2 + margin;
        let clickedY = row * verticalSpacing + verticalSpacing / 2 + margin;

        // Find the index of the ring that matches the clicked position
        let ringIndex = rings.findIndex(ring => {
            return Math.abs(ring.x - clickedX) < horizontalSpacing / 2 &&
                Math.abs(ring.y - clickedY) < verticalSpacing / 2;
        });

        if (ringIndex !== -1) {
            let ring = rings[ringIndex];
            let currentPlayer = (turnCount % 2 !== 0) ? 1 : -1;
            if ((ring.number > 0 && currentPlayer === 1) || ((ring.number < 0 && currentPlayer === -1))) {
                // Remove the ring from the internal board
                internalBoard[row][col] = 0;
                // Remove the ring and update score
                rings.splice(ringIndex, 1);
                score[currentPlayer === 1 ? 'white' : 'black']++;
                drawRemovedRings();

                // Check for winning score
                if (score.white === 3 || score.black === 3) {
                    let winner = score.white === 3 ? "White" : "Black";
                    outcome = winner + " wins the game!";
                    updateOutcomeDisplay();
                    gameOver = true; // Set the game over state
                    return;
                }

                // Recheck for sequences
                if (!hasSequencesToRemove(currentPlayer)) {
                    // If no more sequences, then end the turn
                    gameState = 'movingRing';
                    if (hasSequencesToRemove(-currentPlayer)) {
                        gameState = 'removingSequenceAtStart';
                    }
                    selectSequence = false;
                    if (!selectSequenceAtStart) {
                        turnCount++;
                        updateTurnDisplay();
                        if (botEnabled && turnCount % 2 !== 0) {
                            makeBotMove();
                        }
                    }
                    console.log("Ring Index: " + ringIndex);
                }
            }
            playPiecePlacedSound();
            drawGrid();
        }
    }

    function drawRemovedRings() {
        const bottomLeftStartX = margin;  // Starting X position for white rings at the bottom left
        const bottomLeftStartY = canvas.height - margin - (radius * 2);  // Starting Y just above the bottom edge
        const upperRightStartX = canvas.width - margin - (radius * 2);  // Starting X for black rings just left of the right edge
        const upperRightStartY = margin;  // Starting Y position for black rings at the upper right

        // Calculate the spacing based on the size of the rings
        const spacing = radius * 20; // Space between the centers of the rings

        // Draw white removed rings along the bottom left
        let posX = bottomLeftStartX + radius; // Start from the left edge
        for (let i = 0; i < score.white; i++) {
            gameBoard.drawRing(posX, bottomLeftStartY, 2); // 2 for white ring
            posX += spacing; // Move to the right for the next ring
        }

        // Draw black removed rings along the upper right
        posX = upperRightStartX - radius; // Start from the right edge
        for (let i = 0; i < score.black; i++) {
            gameBoard.drawRing(posX, upperRightStartY, -2); // -2 for black ring
            posX -= spacing; // Move to the left for the next ring
        }
    }

    function updateGameState() {
        let currentPlayerColor = (turnCount % 2 !== 0) ? 1 : -1;
        // Check if there are sequences to remove for the current player
        if (turnCount < 11) {
            gameState = 'placingRings';
        } else if (selectSequence && gameState === 'removingSequenceAtStart') {
            if (hasSequencesToRemove(currentPlayerColor)) {
                gameState = 'selectingSequence';
            } else {
                gameState = 'removingRing';
            }
        } else if (gameState === 'selectingSequence') {
            if (selectSequence) {
                gameState = 'selectingSequence';
            } else {
                gameState = 'removingRing';
            }
        } else if (gameState === 'removingRing') {
            gameState = 'selectingSequence';
        }
        else if (gameState === 'removingSequenceAtStart') {
            gameState = 'removingSequenceAtStart';
        }
        else if (hasSequencesToRemove(currentPlayerColor)) {
            gameState = 'selectingSequence';
        } else {
            gameState = 'movingRing';
        }
    }

    function getCursorPosition(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;    // relationship bitmap vs. element for X
        const scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

        const mouseColumn = (event.clientX - rect.left) * scaleX;  // scale mouse coordinates after they have
        const mouseRow = (event.clientY - rect.top) * scaleY;   // been adjusted to be relative to element

        // Padding for each cell to make clickable area larger
        const cellPadding = gridSize * 0.03; // This value can be adjusted based on your grid size

        // Convert mouse coordinates to grid indices with padding
        const adjustedColumn = Math.floor((mouseColumn + cellPadding) / horizontalSpacing) - 1;
        const adjustedRow = Math.floor((mouseRow) / verticalSpacing) - 1;

        console.log(gameState);

        switch (gameState) {
            case 'placingRings':
                addRingToBoard(adjustedRow, adjustedColumn);
                break;
            case 'selectingSequence':
                removeMarkerSequence(adjustedRow, adjustedColumn);
                drawGrid();
                break;
            case 'removingSequenceAtStart':
                selectSequenceAtStart = true;
                selectSequence = true;
                removeMarkerSequence(adjustedRow, adjustedColumn);
                break;
            case 'removingRing':
                gameBoard.drawRingsForRemoval(rings, (turnCount % 2 !== 0) ? 1 : -1);
                drawGrid();
                removeRingIfClicked(adjustedRow, adjustedColumn);
                break;
            case 'movingRing':
                selectRing(adjustedRow, adjustedColumn);
                moveRing(adjustedRow, adjustedColumn);
                break;
        }
        if (gameState === 'movingRing'){
           return;
        }
        updateGameState();
    }

    function onMouseMove(event) {
        // Calculate the mouse position within the canvas
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;    // relationship bitmap vs. element for X
        const scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

        const mouseX = (event.clientX - rect.left) * scaleX;  // scale mouse coordinates after they have
        const mouseY = (event.clientY - rect.top) * scaleY;   // been adjusted to be relative to element

        updateHoverEffect(mouseX, mouseY);
    }

    canvas.addEventListener('click', function(event) {
        if (gameOver) {
            console.log("Game over. No further interactions allowed.");
            return;
        }
        if (botEnabled && turnCount % 2 !== 0) {
            return;
        }
        getCursorPosition(canvas, event);
    });

    canvas.addEventListener('mousemove', onMouseMove);

    function updateUndoButtonState() {
        const undoButton = document.getElementById('undoButton');
        undoButton.disabled = history.length === 0;
    }

    function updateRedoButtonState() {
        const redoButton = document.getElementById('redoButton');
        redoButton.disabled = future.length === 0;
    }

    // Method to save the current state
    function saveState() {
        // Create a deep copy of the current game state
        console.log("Saved markers: " + markers);
        const currentState = {
            rings: JSON.parse(JSON.stringify(rings)),
            markers: JSON.parse(JSON.stringify(markers)),
            internalBoard: JSON.parse(JSON.stringify(internalBoard)),
            score: JSON.parse(JSON.stringify(score)),
            turnCount: turnCount,
            markerCount: markerCount
        };

        history.push(currentState);
        future = []; // Clear the redo history when a new action is taken
    }

    // Helper method to load a saved state
    function loadState(state) {
        rings = state.rings;
        markers = state.markers;
        turnCount = state.turnCount;
        markerCount = state.markerCount;
        internalBoard = state.internalBoard;
        score = state.score;
        gameState = turnCount > 10 ? 'movingRing' : 'placingRings';
        possibleMoves = [];
        selectedRing = null;
        clickableMarkers = [];
        // Load other relevant game state properties
        console.log("Loaded markers: " + markers);
        updateTurnDisplay();
        updateMarkerDisplay();
        drawGrid(); // Redraw the board with the loaded state
    }

    // Helper method to get the current game state
    function getCurrentState() {
        return {
            rings: JSON.parse(JSON.stringify(rings)),
            markers: JSON.parse(JSON.stringify(markers)),
            turnCount: turnCount,
            markerCount: markerCount,
            score: score,
            internalBoard: JSON.parse(JSON.stringify(internalBoard)),
        };
    }

    function undo() {
        if (history.length > 0) {
            const lastState = history.pop();
            future.push(getCurrentState()); // Save the current state for redo
            loadState(lastState);
        }
        updateUndoButtonState();
        updateRedoButtonState();
    }

    function redo() {
        if (future.length > 0) {
            const nextState = future.pop();
            history.push(getCurrentState()); // Save the current state for undo
            loadState(nextState);
        }
        updateRedoButtonState();
        updateUndoButtonState();
    }

    document.getElementById('undoButton').addEventListener('click', () => undo());
    document.getElementById('redoButton').addEventListener('click', () => redo());
    document.getElementById('randomizeRings').addEventListener('click', function() {
        randomizeRings();
    });

    function randomizeRings() {
        // Reset the game state
        BOARD_TEMPLATE.forEach((columns, row) => {
            columns.forEach(column => {
                internalBoard[row][column] = 0; // Mark valid coordinates
            });
        });
        rings = [];
        markers = [];
        markerSequences = [];
        clickableMarkers = [];
        selectedRing = null;
        hoverPos = null;
        possibleMoves = [];
        score = { white: 0, black: 0 };
        outcome = '';
        gameOver = false;
        turnCount = 1;
        markerCount = 0;
        gameState = 'movingRing';
        selectSequence = false;
        selectSequenceAtStart = false;
        document.getElementById('botCheckbox').checked = false;

        updateTurnDisplay();
        updateMarkerDisplay();
        updateOutcomeDisplay();

        // Clear the removed rings canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let availablePositions = [];
        BOARD_TEMPLATE.forEach((columns, row) => {
            columns.forEach(col => {
                if (internalBoard[row][col] === 0) {
                    availablePositions.push({ row, col });
                }
            });
        });

        let ringNumber = turnCount % 2 !== 0 ? 2 : -2;
        for (let i = 0; i < 10; i++) {
            let randomIndex = Math.floor(Math.random() * availablePositions.length);
            let position = availablePositions[randomIndex];
            availablePositions.splice(randomIndex, 1); // Remove the chosen position

            // Place the ring on the board
            internalBoard[position.row][position.col] = ringNumber;
            rings.push({
                x: position.col * horizontalSpacing + horizontalSpacing / 2 + margin,
                y: position.row * verticalSpacing + verticalSpacing / 2 + margin,
                row: position.col,
                col: position.row ,
                number: ringNumber
            });
            ringNumber *= -1; // Flip the ring number
        }

        turnCount = 11; // Update turn count to reflect that all rings are placed
        updateTurnDisplay();
        playPiecePlacedSound();
        drawGrid();
    }

    // Function to update the turn count display
    function updateTurnDisplay() {
        const turnCounterElement = document.getElementById('turnCounter');
        turnCounterElement.innerHTML = `<strong>Turn:</strong> ${turnCount} (${turnCount % 2 !== 0 ? 'White' : 'Black'})`;
    }

    // Function to update the turn count display
    function updateMarkerDisplay() {
        const markerCounterElement = document.getElementById('markerCounter');
        markerCounterElement.innerHTML = `<strong>Markers:</strong> ${markerCount}/51`;
    }

    // Function to update the outcome displayer
    function updateOutcomeDisplay() {
        const outcomeElement = document.getElementById('outcome');
        outcomeElement.textContent = `${outcome}`;
    }

    updateUndoButtonState();
    updateRedoButtonState();

    function toggleBot() {
        botEnabled = document.getElementById('botCheckbox').checked;
        if (botEnabled && turnCount % 2 !== 0) { // Check if it's White's turn
            makeBotMove();
        }
    }

    function makeBotMove() {
        let boardCopy = internalBoard.map(row => row.slice());
        let selectedBotRing = null;

        // Check if it's the bot's turn
        if (botEnabled && turnCount % 2 !== 0 && gameState === 'placingRings') {
            let emptySpots = [];

            // Find all empty spots
            for (let row = 0; row < internalBoard.length; row++) {
                for (let col = 0; col < internalBoard[row].length; col++) {
                    if (internalBoard[row][col] === 0) {
                        emptySpots.push({ row, col });
                    }
                }
            }

            // Select a random spot
            let randomIndex = Math.floor(Math.random() * emptySpots.length);
            let randomSpot = emptySpots[randomIndex];

            // Make the move
            addRingToBoard(randomSpot.row, randomSpot.col);
        }

        if (botEnabled && turnCount % 2 !== 0 && gameState === 'movingRing') {
            console.log("Bot's turn for moving Ring")
            // Find all of White's rings
            let whiteRings = [];
            for (let row = 0; row < boardCopy.length; row++) {
                for (let col = 0; col < boardCopy[row].length; col++) {
                    if (boardCopy[row][col] === 2) { // Assuming 2 represents a White ring
                        whiteRings.push({ row, col });
                    }
                }
            }

            // Evaluate and select the best move
            let bestScore = -Infinity;
            let bestMove = null;
            let bestRing = null;

            // Select a White ring
            for (let ring of whiteRings) {
                selectBotRing(ring.row, ring.col);
                for (let move of possibleMoves) {
                    let tempBoard = simulateMove(move[0], move[1], boardCopy);
                    let score = evaluateBoard(tempBoard);
                    console.log(score);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = move;
                        bestRing = ring;
                    }
                }
            }

            console.log(bestScore);
            if (bestMove) {
                selectRing(bestRing.row, bestRing.col)
                moveRing(bestMove[0], bestMove[1]);
            }
        }
        function selectBotRing(row, col) {
            selectedBotRing = { row, col };
            getPossibleMoves(row, col);
        }

        function simulateMove(newRow, newCol, board) {
            if (!possibleMoves.some(point => point[0] === newRow && point[1] === newCol)) {
                console.log("Invalid move");
                return;
            }
            let tempBoard = board.map(row => row.slice());

            let ringNumber = turnCount % 2 !== 0 ? 2 : -2;
            // Place a marker at the ring.
            tempBoard[selectedBotRing.row][selectedBotRing.col] = turnCount % 2 !== 0 ? 1 : -1;
            tempBoard[newRow][newCol] = ringNumber;

            tempBoard = flipMarkersForBot(selectedBotRing.row, selectedBotRing.col, newRow, newCol, tempBoard);

            return tempBoard;
        }

        function flipMarkersForBot(startRow, startCol, endRow, endCol, tempBoard) {
            const allPaths = verticalLists.concat(diagonalLists, antiDiagonalLists);

            allPaths.forEach(path => {
                if (path.some(point => point[0] === startRow && point[1] === startCol) &&
                    path.some(point => point[0] === endRow && point[1] === endCol)) {

                    let startIndex = path.findIndex(point => point[0] === startRow && point[1] === startCol);
                    let endIndex = path.findIndex(point => point[0] === endRow && point[1] === endCol);

                    if (startIndex > endIndex) {
                        [startIndex, endIndex] = [endIndex, startIndex]; // Swap if start is greater than end
                    }

                    for (let i = startIndex + 1; i < endIndex; i++) {
                        let [row, col] = path[i];
                        if (tempBoard[row][col] === 1 || boardCopy[row][col] === -1) {
                            tempBoard[row][col] *= -1; // Flip the marker
                        }
                    }
                }
            });
            return tempBoard;
        }
    }

    function evaluateBoard(board) {
        let score = 0;
        score += evaluateLines(board, verticalLists);
        score += evaluateLines(board, diagonalLists);
        score += evaluateLines(board, antiDiagonalLists);
        return score;
    }

    function evaluateLines(board, lines) {
        let lineScore = 0;
        for (let line of lines) {
            lineScore += evaluateSingleLine(board, line, 1);
            lineScore -= evaluateSingleLine(board, line, -1);
        }
        return lineScore;
    }

    function evaluateSingleLine(board, line, player) {
        let markersInRow = 0;
        let lineScore = 0;

        for (let point of line) {
            if (board[point[0]][point[1]] === player) {
                markersInRow++;
            } else if (board[point[0]][point[1]] === 2 * player) {
                markersInRow += 0.5;
            } else {
                lineScore += calculateScore(markersInRow);
                markersInRow = 0
            }
        }

        // Calculate score for the last segment
        lineScore += calculateScore(markersInRow);

        return lineScore;
    }
    
    function calculateScore(markersInRow) {
        if (markersInRow > 0) {
            return Math.pow(3, markersInRow - 1);
        }
        return 0;
    }

    gameBoard.draw(rings, markers, possibleMoves, clickableMarkers);
});

