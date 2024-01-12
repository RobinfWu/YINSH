document.addEventListener("DOMContentLoaded", function() {
    let currentPlayer = 1; // 1 for white, -1 for black
    let ringCounter = { '1': 2, '-1': -2 }; // Starting values for ring numbers
    let selectedRing = null;
    let hoverPos = null; // Stores the position of the hover effect
    let rings = []; // Stores the positions of all placed rings
    let possibleMoves = [];
    let markers = [];
    let turnCount = 1; // Initialize turn counter
    let markerCount = 0;
    let markerSequences = []; // Stores sequences of 5 or more markers
    let clickableMarkers = [];
    let selectMarkerState = false;
    let removeRingState = false;
    let playerToRemoveRing = null; // This will be set to 1 for white or -1 for black
    let removeRingAtStartOfTurn = null;
    let score = { white: 0, black: 0 };
    let outcome = ''
    let gameOver = false;


    function drawGrid() {
        ctx.fillStyle = 'black'; // Change the color if needed
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        function drawHexagonBackground(ctx, vertices) {
            ctx.beginPath();
            const startY = vertices[0].x * verticalSpacing + verticalSpacing / 2 + margin;
            const startX = vertices[0].y * horizontalSpacing + horizontalSpacing / 2 + margin;
            ctx.moveTo(startX, startY);

            for (let i = 1; i < vertices.length; i++) {
                const y = vertices[i].x * verticalSpacing + verticalSpacing / 2 + margin;
                const x = vertices[i].y * horizontalSpacing + horizontalSpacing / 2 + margin;
                ctx.lineTo(x, y);
            }

            ctx.closePath(); // Closes the path to the starting point to form a shape
            ctx.fillStyle = '#C3D0D8';
            ctx.fill();
        }

        function drawGridWithWhiteBackground(ctx) {
            // Draw the white hexagonal background
            drawHexagonBackground(ctx, hexagonVertices);
        }

        // Call this function in your main drawing routine
        drawGridWithWhiteBackground(ctx);

        function drawLines(lineList) {
            lineList.forEach(line => {
                const [[startRow, startCol], [endRow, endCol]] = line;

                // Translate grid indices to canvas coordinates
                const startX = startCol * horizontalSpacing + horizontalSpacing / 2 + margin;
                const startY = startRow * verticalSpacing + verticalSpacing / 2 + margin;
                const endX = endCol * horizontalSpacing + horizontalSpacing / 2 + margin;
                const endY = endRow * verticalSpacing + verticalSpacing / 2 + margin;

                // Draw the line on the canvas
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            });
        }

        // Set the style for the diagonal lines
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        // Draw the vertical lines
        drawLines(verticalGridLists);

        // Draw the diagonal lines
        drawLines(diagonalGridLists);

        // Draw the anti-diagonal lines
        drawLines(antiDiagonalGridLists);

        // Loop over each row in the BOARD_TEMPLATE
        BOARD_TEMPLATE.forEach((columns, row) => {
            // Loop over each column index in the current row
            columns.forEach(column => {
                // Calculate the x and y position for each dot, based on the index
                // and account for the margin
                const x = column * horizontalSpacing + horizontalSpacing / 2 + margin;
                const y = row * verticalSpacing + verticalSpacing / 2 + margin;

                if (possibleMoves.some(point => point[0] === row && point[1] === column)) {
                    ctx.fillStyle = 'red'; // Set fill style for red circles
                } else {
                    ctx.fillStyle = 'black'; // Set fill style for default circles
                }

                // Draw the dot
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        // Draw markers
        markers.forEach(marker => {
            ctx.fillStyle = marker.color;
            ctx.beginPath();
            ctx.arc(marker.x, marker.y, 6 * radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw the thin border (blue for regular, red for clickable)
            const isClickable = clickableMarkers.some(cm => cm.row === marker.row && cm.col === marker.col);
            ctx.strokeStyle = isClickable ? 'red' : '#004995';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Highlight rings for removal if in remove ring state
        if (removeRingState) {
            rings.forEach(ring => {
                if (ring.number > 0 && playerToRemoveRing  === 1 || ring.number < 0 && playerToRemoveRing  === -1) {
                    // Draw a red border around the ring
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = radius;
                    ctx.beginPath();
                    ctx.arc(ring.x, ring.y, 3 * radius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
        }

        drawRemovedRings();

        // Draw the hover effect for potential moves
        if (hoverPos && hoverPos.isPotentialMove) {
            // First draw the black border
            ctx.beginPath();
            ctx.arc(hoverPos.x, hoverPos.y, 9 * radius, 0, Math.PI * 2); // The border circle is slightly larger
            ctx.strokeStyle = 'black'; // Color for the border
            ctx.lineWidth = radius; // Width of the border
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(hoverPos.x, hoverPos.y, 7 * radius, 0, Math.PI * 2); // The border circle is slightly smaller
            ctx.strokeStyle = 'black'; // Color for the border
            ctx.lineWidth = radius; // Width of the border
            ctx.stroke();

            // Draw grey ring around the potential move position
            ctx.beginPath();
            ctx.arc(hoverPos.x, hoverPos.y, 8 * radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'grey';  // Permanent rings in white, hover effect in grey
            ctx.lineWidth = (5 * radius / 2);
            ctx.stroke();
        } else {
            // Draw the hover effect
            if (hoverPos) {
                let ringNumberAtHover = internalBoard[hoverPos.row][hoverPos.col];
                if (ringNumberAtHover != 0 && !selectMarkerState) {
                    drawRing(hoverPos.x, hoverPos.y, ringNumberAtHover, true);
                } else if (turnCount <= 11) {
                    drawRing(hoverPos.x, hoverPos.y, 0, true);
                }
            }
        }

        // Draw all permanent rings
        rings.forEach(ring => {
            drawRing(ring.x, ring.y, ring.number, false);
        });
    }

    // Function to draw the hover effect or ring
    function drawRing(cx, cy, ringNumber = 0, isHovering = false) {
        let isTurnWhite = turnCount % 2 !== 0;
        let isTurnBlack = turnCount % 2 === 0;
        // Determine the color based on the ring number
        let ringColor;
        if (ringNumber === 0 && isHovering) { // Hover effect
            // During the ring placement stage, show the hovering ring in the player's color
            ringColor = isTurnWhite? 'white' : 'black';
        } else {
            ringColor = ringNumber > 0 ? 'white' : 'black'; // Permanent rings
        }

        // Adjust hover effect condition
        if (isHovering && !selectMarkerState && !removeRingState && turnCount > 10) {
            // This checks if we're not in a state of selecting a marker or removing a ring
            let isPlayerRing = (isTurnWhite && ringNumber > 0) || (isTurnBlack && ringNumber < 0);
            if (isPlayerRing) {
                // Set color for the filled circle based on the current player
                ctx.fillStyle = isTurnWhite ? 'white' : 'black';
                ctx.beginPath();
                ctx.arc(cx, cy, 6 * radius, 0, Math.PI * 2);
                ctx.fill();

                // Draw the thin blue border
                ctx.strokeStyle = '#004995';
                ctx.lineWidth = 2;
                ctx.stroke();

                return; // Skip drawing the rest if it's just a hover effect
            }
        }

        // First draw the black border
        ctx.beginPath();
        ctx.arc(cx, cy, 9 * radius, 0, Math.PI * 2); // The border circle is slightly larger
        ctx.strokeStyle = 'black'; // Color for the border
        ctx.lineWidth = radius; // Width of the border
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 7 * radius, 0, Math.PI * 2); // The border circle is slightly smaller
        ctx.strokeStyle = 'black'; // Color for the border
        ctx.lineWidth = radius; // Width of the border
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 8 * radius, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;  // Permanent rings in white, hover effect in grey
        ctx.lineWidth = (5 * radius / 2);
        ctx.stroke();
    }

    // Function to add a ring to the internal board representation
    function addRingToBoard(row, col) {
        // Count the number of rings already placed
        let totalRingsPlaced = rings.length;

        // Check if it's within the first ten turns and the selected spot is empty
        if (turnCount <= 10 && internalBoard[row] && internalBoard[row][col] === 0) {
            internalBoard[row][col] = ringCounter[currentPlayer];
            rings.push({ x: col * horizontalSpacing + horizontalSpacing / 2 + margin, y: row * verticalSpacing + verticalSpacing / 2 + margin, number: ringCounter[currentPlayer] });
            ringCounter[currentPlayer] += currentPlayer; // Increment or decrement the ring number
            currentPlayer *= -1; // Switch player
            turnCount++; // Increment turn count
            updateTurnDisplay(); // Update the display
            playPiecePlacedSound();
            drawGrid(); // Redraw the grid with the new ring
        } else if (turnCount > 10) {
            console.log("Rings can no longer be placed. Move existing rings.");
        } else if (totalRingsPlaced >= 10) {
            console.log("All rings placed. No further placement allowed.");
        }
    }

    function isWithinCircle(mouseX, mouseY, circleX, circleY, radius) {
        const dx = mouseX - circleX;
        const dy = mouseY - circleY;
        return dx * dx + dy * dy <= radius * radius * 30;
    }

    // Update the hover effect based on the mouse position
    function updateHoverEffect(mouseX, mouseY) {
        hoverPos = null; // Reset hoverPos
        let isTurnWhite = turnCount % 2 !== 0;
        let isTurnBlack = turnCount % 2 === 0;

        // Check against the BOARD_TEMPLATE
        BOARD_TEMPLATE.forEach((columns, row) => {
            columns.forEach(column => {
                // Calculate the center x and y position based on horizontalSpacing and verticalSpacing
                let cx = column * horizontalSpacing + horizontalSpacing / 2 + margin;
                let cy = row * verticalSpacing + verticalSpacing / 2 + margin;

                if (isWithinCircle(mouseX, mouseY, cx, cy, radius)) {
                    // Check if the position corresponds to the current player's ring
                    let ringValue = internalBoard[row][column];
                    if (turnCount > 10 && ((isTurnWhite && ringValue > 0) || (isTurnBlack && ringValue < 0))) {
                        hoverPos = { x: cx, y: cy, row: row, col: column };
                    } else if (turnCount <= 10) {
                        hoverPos = { x: cx, y: cy, row: row, col: column };
                    }

                    // If there is a hover position, draw the hover ring
                    if (hoverPos) {
                        drawRing(hoverPos.x, hoverPos.y, 0, true); // Pass true for isHovering
                    }
                }
            });
        });

        possibleMoves.forEach(move => {
            const moveX = move[1] * horizontalSpacing + horizontalSpacing / 2 + margin;
            const moveY = move[0] * verticalSpacing + verticalSpacing / 2 + margin;
            if (isWithinCircle(mouseX, mouseY, moveX, moveY, radius)) {
                hoverPos = { x: moveX, y: moveY, isPotentialMove: true };
            }
        });

        drawGrid(); // Redraw the grid
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

    function getCursorPosition(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;    // relationship bitmap vs. element for X
        const scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

        const mouseColumn = (event.clientX - rect.left) * scaleX;  // scale mouse coordinates after they have
        const mouseRow = (event.clientY - rect.top) * scaleY;   // been adjusted to be relative to element

       // Convert mouse coordinates to grid indices
        const adjustedColumn = Math.floor(mouseColumn / horizontalSpacing) - 1;
        const adjustedRow = Math.floor(mouseRow / verticalSpacing) - 1;

        // Check if the click is within the bounds of the board
        if (adjustedRow >= 0 && adjustedRow < 19 &&
            adjustedColumn >= 0 && adjustedColumn < 11 &&
            BOARD_TEMPLATE[adjustedRow].includes(adjustedColumn)) {
            addRingToBoard(adjustedRow, adjustedColumn);
        }

        if (removeRingState) {
            // Only allow ring removal in this state
            removeRingIfClicked(adjustedRow, adjustedColumn);
            if (!removeRingAtStartOfTurn) {
                currentPlayer *= -1;
                turnCount++; // Increment turn count
                updateTurnDisplay(); // Update the display
            }
            removeRingAtStartOfTurn = false;
            drawGrid();
        }

        if (selectedRing) {
            printBoard()
            moveRing(adjustedRow, adjustedColumn);

        } else if (removeRingState === false){
            drawGrid();
            if (selectMarkerState) {
               checkForMarkerRemoval(adjustedRow, adjustedColumn);
            } else {
                checkForMarkerSequences();
                drawGrid();
                if (selectMarkerState) {
                   removeRingAtStartOfTurn = true;
                   checkForMarkerRemoval(gridRow, adjustedColumn);
                }
            }
            selectRing(adjustedRow, adjustedColumn);
            checkForMarkerRemoval(adjustedRow, adjustedColumn);
            drawGrid();
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
            if ((ring.number > 0 && playerToRemoveRing === 1) || (ring.number < 0 && playerToRemoveRing === -1)) {
                // Remove the ring from the internal board
                internalBoard[row][col] = 0;

                // Remove the ring and update score
                rings.splice(ringIndex, 1);
                score[playerToRemoveRing === 1 ? 'white' : 'black']++;
                drawRemovedRings();
                console.log(score)

                // Reset the state and switch turns
                selectMarkerState = false;
                removeRingState = false;
                playerToRemoveRing = null;

                // Check for winning score
                if (score.white === 3 || score.black === 3) {
                    let winner = score.white === 3 ? "White" : "Black";
                    outcome = winner + " wins the game!";
                    updateOutcomeDisplay();
                    gameOver = true; // Set the game over state
                }

                drawGrid();
            }
        }
        if (!gameOver) {
            printBoard();
        }
    }


    function checkForMarkerRemoval(row, col) {
        // Check if the clicked position is a clickable marker
        if (clickableMarkers.some(marker => marker.row === row && marker.col === col)) {
            removeMarkerSequence(row, col);
        }
    }

    function removeMarkerSequence(row, col) {
        // Find the sequence that contains the clicked marker
        let sequenceToRemove = markerSequences.find(sequence =>
            sequence.some(marker => marker.row === row && marker.col === col)
        );

        // Remove markers from the sequence
        if (sequenceToRemove) {
            let scoredMarkerColor = sequenceToRemove[0].color;

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
            // Set the turn to the player whose markers were not just scored

            // Determine the player who needs to remove a ring
            playerToRemoveRing = scoredMarkerColor === 'white' ? 1 : -1;

            selectMarkerState = false;
            removeRingState = true;
            drawGrid(); // Redraw the grid
        }
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
                            markers[markerIndex].color = internalBoard[row][col] === 1 ? 'white' : 'black';
                        }
                    }
                }
            }
        });
    }

    function checkForMarkerSequences() {
        markerSequences = []; // Reset previous sequences
        clickableMarkers = []; // Reset clickable markers

        const allPaths = [...verticalLists, ...diagonalLists, ...antiDiagonalLists];

        allPaths.forEach(path => {
            let currentSequence = [];
            let lastMarker = null;

            path.forEach(([row, col]) => {
                const marker = internalBoard[row][col];
                if (marker === 1 || marker === -1) {
                    if (marker === lastMarker) {
                        currentSequence.push({ row, col, color: marker === 1 ? 'white' : 'black' });
                    } else {
                        if (currentSequence.length >= 5) {
                            markerSequences.push([...currentSequence]);
                        }
                        currentSequence = [{ row, col, color: marker === 1 ? 'white' : 'black' }];
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
        // Identify clickable markers in each sequence
        markerSequences.forEach(sequence => {
            let len = sequence.length;
            let startIndex, endIndex;
            startIndex = 2;
            endIndex = len - 3;

            // Ensure the indices are within bounds and add them to clickableMarkers
            for (let i = startIndex; i <= endIndex && i < len; i++) {
                if (i >= 0) {
                    clickableMarkers.push(sequence[i]);
                }
            }
        });
        if (markerSequences.length > 0) {
            selectMarkerState = true; // Set the state to select marker
        }
    }

    function animateRingMove(startX, startY, endX, endY, ringNumber, callback) {
        const animationDuration = 300; // Duration in milliseconds
        const startTime = Date.now();

        function drawFrame() {
            let currentTime = Date.now();
            let progress = Math.min((currentTime - startTime) / animationDuration, 1);

            let currentX = startX + (endX - startX) * progress;
            let currentY = startY + (endY - startY) * progress;

            // Clear the canvas and redraw everything except the moving ring
            drawGrid(); // You may need to modify drawGrid to optionally exclude the moving ring

            // Draw the moving ring at its current position
            drawRing(currentX, currentY, ringNumber);

            if (progress < 1) {
                window.requestAnimationFrame(drawFrame);
            } else {
                callback(); // Call the callback function once the animation is complete
            }
        }

        drawFrame();
    }

    function moveRing(newRow, newCol) {
        let isTurnWhite = turnCount % 2 !== 0;
        // Check if the new position is valid
        if (!possibleMoves.some(point => point[0] === newRow && point[1] === newCol)) {
            console.log("Invalid move");
            return;
        }

        // Get the ring number from the original position
        let ringNumber = internalBoard[selectedRing.row][selectedRing.col];

        // Remove the ring from the original position
        internalBoard[selectedRing.row][selectedRing.col] = isTurnWhite ? 1 : -1;
        let ringIndex = rings.findIndex(ring => ring.x === selectedRing.col * horizontalSpacing + horizontalSpacing / 2 + margin && ring.y === selectedRing.row * verticalSpacing + verticalSpacing / 2 + margin);
        if (ringIndex !== -1) {
            rings.splice(ringIndex, 1);
        }
        
        let startX = selectedRing.col * horizontalSpacing + horizontalSpacing / 2 + margin;
        let startY = selectedRing.row * verticalSpacing + verticalSpacing / 2 + margin;
        let endX = newCol * horizontalSpacing + horizontalSpacing / 2 + margin;
        let endY = newRow * verticalSpacing + verticalSpacing / 2 + margin;

        animateRingMove(startX, startY, endX, endY, ringNumber, function() {
            // Update game state after animation completes
            // Add the ring to the new position
            internalBoard[newRow][newCol] = ringNumber;
            rings.push({ x: newCol * horizontalSpacing + horizontalSpacing / 2 + margin, y: newRow * verticalSpacing + verticalSpacing / 2 + margin, number: ringNumber });

            // Flip markers along the path
            flipMarkersAlongPath(selectedRing.row, selectedRing.col, newRow, newCol);
            markerCount ++;
            updateMarkerDisplay();
            checkForMarkerSequences();
            let currentPlayerColor = isTurnWhite ? 'white' : 'black';
            clickableMarkers = clickableMarkers.filter(sequence => sequence.color === currentPlayerColor);
            markerSequences = markerSequences.filter(sequence => sequence.length > 0 && sequence[0].color === currentPlayerColor);

            // Reset selectedRing and possibleMoves
            selectedRing = null;
            possibleMoves = [];

            if (selectMarkerState && clickableMarkers.length > 0) {
                drawGrid();
                return;
            } else {
                selectMarkerState = false;
            }

            currentPlayer *= -1;
            turnCount++; // Increment turn count
            updateTurnDisplay(); // Update the display
            checkForMarkerSequences();
            playPiecePlacedSound();
            drawGrid();
        });

        if (selectMarkerState) {
           removeRingAtStartOfTurn = true;
           return;
        }

        if (markers.length == 51) {
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
    }

    function selectRing(row, col) {
        if (selectMarkerState || removeRingState) {
            console.log("Select a marker sequence first or remove a ring first");
            return;
        }

        let ringValue = internalBoard[row][col];
        let isTurnWhite = turnCount % 2 !== 0;
        let isTurnBlack = turnCount % 2 === 0;

        let isPlayerWhiteRing = isTurnWhite && ringValue >= 2 && ringValue <= 6;
        let isPlayerBlackRing = isTurnBlack && ringValue >= -6 && ringValue <= -2;

        if ((isPlayerWhiteRing || isPlayerBlackRing) && turnCount > 10) {
            selectedRing = { row, col };
            highlightMoves(row, col);
            // Place a marker at the original ring position
            let markerPosition = {
                x: col * horizontalSpacing + horizontalSpacing / 2 + margin,
                y: row * verticalSpacing + verticalSpacing / 2 + margin,
                row: row,
                col: col,
                color: isTurnWhite ? 'white' : 'black'
            };
            markers.push(markerPosition);

            drawGrid();
        }
    }

    function highlightMoves(row, col) {
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
            drawRingOnRemovedCanvas(ctx, posX, bottomLeftStartY, 1); // 1 for white ring
            posX += spacing; // Move to the right for the next ring
        }

        // Draw black removed rings along the upper right
        posX = upperRightStartX - radius; // Start from the right edge
        for (let i = 0; i < score.black; i++) {
            drawRingOnRemovedCanvas(ctx, posX, upperRightStartY, -1); // -1 for black ring
            posX -= spacing; // Move to the left for the next ring
        }
    }

    function drawRingOnRemovedCanvas(ctx, cx, cy, ringNumber) {
        // Draw the ring on the provided context (ctx)
        // Define ring color based on ringNumber
        let ringColor = ringNumber > 0 ? 'white' : 'black';

        // First draw the black border
        ctx.beginPath();
        ctx.arc(cx, cy, 9 * radius, 0, Math.PI * 2); // The border circle is slightly larger
        ctx.strokeStyle = 'black'; // Color for the border
        ctx.lineWidth = radius; // Width of the border
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 7 * radius, 0, Math.PI * 2); // The border circle is slightly smaller
        ctx.strokeStyle = 'black'; // Color for the border
        ctx.lineWidth = radius; // Width of the border
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 8 * radius, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;  // Permanent rings in white, hover effect in grey
        ctx.lineWidth = (5 * radius / 2);
        ctx.stroke();
    }

    function randomizeRings() {
        // Reset the game state
        internalBoard.forEach(row => {
            for (let i = 0; i < row.length; i++) {
                if (row[i] !== 9) {
                    row[i] = 0;
                }
            }
        });
        rings = [];
        markers = [];
        markerSequences = [];
        clickableMarkers = [];
        selectMarkerState = false;
        removeRingState = false;
        selectedRing = null;
        hoverPos = null;
        playerToRemoveRing = null;
        removeRingAtStartOfTurn = null;
        possibleMoves = []
        score = { white: 0, black: 0 };
        outcome = '';
        gameOver = false;
        currentPlayer = 1;
        ringCounter = { '1': 2, '-1': -2 };
        turnCount = 1;
        markerCount = 0;
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

        for (let i = 0; i < 10; i++) {
            let randomIndex = Math.floor(Math.random() * availablePositions.length);
            let position = availablePositions[randomIndex];
            availablePositions.splice(randomIndex, 1); // Remove the chosen position

            // Place the ring on the board
            internalBoard[position.row][position.col] = ringCounter[currentPlayer];
            rings.push({
                x: position.col * horizontalSpacing + horizontalSpacing / 2 + margin,
                y: position.row * verticalSpacing + verticalSpacing / 2 + margin,
                number: ringCounter[currentPlayer]
            });

            ringCounter[currentPlayer] += currentPlayer; // Update the ring number
            currentPlayer *= -1; // Switch player after each ring placement
        }
        turnCount = 11; // Update turn count to reflect that all rings are placed
        updateTurnDisplay();
        playPiecePlacedSound();
        drawGrid();
    }

    // Function to update the turn count display
    function updateTurnDisplay() {
        const turnCounterElement = document.getElementById('turnCounter');
        turnCounterElement.innerHTML = `<strong>Turn:</strong> ${turnCount}`;
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

    canvas.addEventListener('mousemove', onMouseMove);
    // Attach the click event to the canvas
    canvas.addEventListener('click', function(event) {
        if (gameOver) {
            console.log("Game over. No further interactions allowed.");
            return;
        }
        getCursorPosition(canvas, event);
    });

    document.getElementById('randomizeRings').addEventListener('click', function() {
        randomizeRings();
    });

    drawGrid();
});
