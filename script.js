document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById('yinshBoard');
    const ctx = canvas.getContext('2d');
    document.getElementById('randomizeRings').addEventListener('click', function() {
        randomizeRings();
    });

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

    const BOARD_TEMPLATE = [
        [4, 6], [3, 5, 7], [2, 4, 6, 8], [1, 3, 5, 7, 9], [2, 4, 6, 8],
        [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10], [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10],
        [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10], [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10],
        [1, 3, 5, 7, 9], [2, 4, 6, 8], [1, 3, 5, 7, 9], [2, 4, 6, 8], [3, 5, 7], [4, 6]
    ];

    // Representing the board in a 19x11 grid
    const internalBoard = new Array(19).fill(0).map(() => new Array(11).fill(9));
    BOARD_TEMPLATE.forEach((columns, row) => {
        columns.forEach(column => {
            internalBoard[row][column] = 0; // Mark valid coordinates
        });
    });
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
            // Define the vertices of the hexagon boundary of the grid
            const hexagonVertices = [
                { x: 0, y: 4 },
                { x: 3, y: 1 },
                { x: 5, y: 1 },
                { x: 6, y: 0 },
                { x: 12, y: 0 },
                { x: 13, y: 1 },
                { x: 15, y: 1 },
                { x: 18, y: 4 },
                { x: 17, y: 5 },
                { x: 18, y: 6 },
                { x: 15, y: 9 },
                { x: 13, y: 9 },
                { x: 12, y: 10 },
                { x: 6, y: 10 },
                { x: 5, y: 9 },
                { x: 3, y: 9 },
                { x: 0, y: 6 },
                { x: 1, y: 5 },
                { x: 0, y: 4 }
            ];

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

        // Define the vertical lines
        const verticalLists = [
                [[6, 0], [12, 0]],
                [[3, 1], [15, 1]],
                [[2, 2], [16, 2]],
                [[1, 3], [17, 3]],
                [[0, 4], [18, 4]],
                [[1, 5], [17, 5]],
                [[0, 6], [18, 6]],
                [[1, 7], [17, 7]],
                [[2, 8], [16, 8]],
                [[3, 9], [15, 9]],
                [[6, 10], [12, 10]]
        ];

        // Define the diagonal lines
        const diagonalLists = [
                [[15, 1], [18, 4]],
                [[12, 0], [18, 6]],
                [[10, 0], [17, 7]],
                [[8, 0], [16, 8]],
                [[6, 0], [15, 9]],
                [[5, 1], [13, 9]],
                [[3, 1], [12, 10]],
                [[2, 2], [10, 10]],
                [[1, 3], [8, 10]],
                [[0, 4], [6, 10]],
                [[0, 6], [3, 9]],
            ];

        // Define the anti-diagonal lines
        const antiDiagonalLists = [
                [[0, 4], [3, 1]],
                [[0, 6], [6, 0]],
                [[1, 7], [8, 0]],
                [[2, 8], [10, 0]],
                [[3, 9], [12, 0]],
                [[5, 9], [13, 1]],
                [[6, 10], [15, 1]],
                [[8, 10], [16, 2]],
                [[10, 10], [17, 3]],
                [[12, 10], [18, 4]],
                [[15, 9], [18, 6]]
        ];

        // Set the style for the diagonal lines
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;

        // Draw the vertical lines
        drawLines(verticalLists);

        // Draw the diagonal lines
        drawLines(diagonalLists);

        // Draw the anti-diagonal lines
        drawLines(antiDiagonalLists);

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
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(ring.x, ring.y, radius + 3, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
        }

        drawRemovedRings();

        // Draw the hover effect for potential moves
        if (hoverPos && hoverPos.isPotentialMove) {
            // First draw the black border
            ctx.beginPath();
            ctx.arc(hoverPos.x, hoverPos.y, 8 * radius + 3, 0, Math.PI * 2); // The border circle is slightly larger
            ctx.strokeStyle = 'black'; // Color for the border
            ctx.lineWidth = 2; // Width of the border
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(hoverPos.x, hoverPos.y, 8 * radius - 3, 0, Math.PI * 2); // The border circle is slightly smaller
            ctx.strokeStyle = 'black'; // Color for the border
            ctx.lineWidth = 2; // Width of the border
            ctx.stroke();

            // Draw grey ring around the potential move position
            ctx.beginPath();
            ctx.arc(hoverPos.x, hoverPos.y, 8 * radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'grey';  // Permanent rings in white, hover effect in grey
            ctx.lineWidth = 6;
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
        ctx.arc(cx, cy, 8 * radius + 3, 0, Math.PI * 2); // The border circle is slightly larger
        ctx.strokeStyle = 'black'; // Color for the border
        ctx.lineWidth = 2; // Width of the border
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 8 * radius - 3, 0, Math.PI * 2); // The border circle is slightly smaller
        ctx.strokeStyle = 'black'; // Color for the border
        ctx.lineWidth = 2; // Width of the border
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 8 * radius, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;  // Permanent rings in white, hover effect in grey
        ctx.lineWidth = 6;
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

    function moveRing(newRow, newCol) {
        let isTurnWhite = turnCount % 2 !== 0;
        let isTurnBlack = turnCount % 2 === 0;
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

        // Place a marker at the original ring position
        let markerPosition = { x: selectedRing.col * horizontalSpacing + horizontalSpacing / 2 + margin, y: selectedRing.row * verticalSpacing + verticalSpacing / 2 + margin, row: selectedRing.row, col: selectedRing.col, color: isTurnWhite ? 'white' : 'black' };
        markers.push(markerPosition);

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
        drawGrid();
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
        // Redraw the grid with the updated positions
        drawGrid();
    }

    function selectRing(row, col) {
        if (selectMarkerState || removeRingState) {
            console.log("Select a marker sequence first or remove a ring first");
            console.log(currentPlayer)
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
        }
    }

    const verticalLists = [
            [[6, 0], [8, 0], [10, 0], [12, 0]],
            [[3, 1], [5, 1], [7, 1], [9, 1], [11, 1], [13, 1], [15, 1]],
            [[2, 2], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2], [16, 2]],
            [[1, 3], [3, 3], [5, 3], [7, 3], [9, 3], [11, 3], [13, 3], [15, 3], [17, 3]],
            [[0, 4], [2, 4], [4, 4], [6, 4], [8, 4], [10, 4], [12, 4], [14, 4], [16, 4], [18, 4]],
            [[1, 5], [3, 5], [5, 5], [7, 5], [9, 5], [11, 5], [13, 5], [15, 5], [17, 5]],
            [[0, 6], [2, 6], [4, 6], [6, 6], [8, 6], [10, 6], [12, 6], [14, 6], [16, 6], [18, 6]],
            [[1, 7], [3, 7], [5, 7], [7, 7], [9, 7], [11, 7], [13, 7], [15, 7], [17, 7]],
            [[2, 8], [4, 8], [6, 8], [8, 8], [10, 8], [12, 8], [14, 8], [16, 8]],
            [[3, 9], [5, 9], [7, 9], [9, 9], [11, 9], [13, 9], [15, 9]],
            [[6, 10], [8, 10], [10, 10], [12, 10]]
        ];

    const diagonalLists = [
            [[15, 1], [16, 2], [17, 3], [18, 4]],
            [[12, 0], [13, 1], [14, 2], [15, 3], [16, 4], [17, 5], [18, 6]],
            [[10, 0], [11, 1], [12, 2], [13, 3], [14, 4], [15, 5], [16, 6], [17, 7]],
            [[8, 0], [9, 1], [10, 2], [11, 3], [12, 4], [13, 5], [14, 6], [15, 7], [16, 8]],
            [[6, 0], [7, 1], [8, 2], [9, 3], [10, 4], [11, 5], [12, 6], [13, 7], [14, 8], [15, 9]],
            [[5, 1], [6, 2], [7, 3], [8, 4], [9, 5], [10, 6], [11, 7], [12, 8], [13, 9]],
            [[3, 1], [4, 2], [5, 3], [6, 4], [7, 5], [8, 6], [9, 7], [10, 8], [11, 9], [12, 10]],
            [[2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10]],
            [[1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9], [8, 10]],
            [[0, 4], [1, 5], [2, 6], [3, 7], [4, 8], [5, 9], [6, 10]],
            [[0, 6], [1, 7], [2, 8], [3, 9]],
        ];

    const antiDiagonalLists = [
            [[0, 4], [1, 3], [2, 2], [3, 1]],
            [[0, 6], [1, 5], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0]],
            [[1, 7], [2, 6], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1], [8, 0]],
            [[2, 8], [3, 7], [4, 6], [5, 5], [6, 4], [7, 3], [8, 2], [9, 1], [10, 0]],
            [[3, 9], [4, 8], [5, 7], [6, 6], [7, 5], [8, 4], [9, 3], [10, 2], [11, 1], [12, 0]],
            [[5, 9], [6, 8], [7, 7], [8, 6], [9, 5], [10, 4], [11, 3], [12, 2], [13, 1]],
            [[6, 10], [7, 9], [8, 8], [9, 7], [10, 6], [11, 5], [12, 4], [13, 3], [14, 2], [15, 1]],
            [[8, 10], [9, 9], [10, 8], [11, 7], [12, 6], [13, 5], [14, 4], [15, 3], [16, 2]],
            [[10, 10], [11, 9], [12, 8], [13, 7], [14, 6], [15, 5], [16, 4], [17, 3]],
            [[12, 10], [13, 9], [14, 8], [15, 7], [16, 6], [17, 5], [18, 4]],
            [[15, 9], [16, 8], [17, 7], [18, 6]]
        ];

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
        ctx.arc(cx, cy, 8 * radius + 3, 0, Math.PI * 2); // The border circle is slightly larger
        ctx.strokeStyle = 'black'; // Color for the border
        ctx.lineWidth = 2; // Width of the border
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 8 * radius - 3, 0, Math.PI * 2); // The border circle is slightly smaller
        ctx.strokeStyle = 'black'; // Color for the border
        ctx.lineWidth = 2; // Width of the border
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, 8 * radius, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;  // Permanent rings in white, hover effect in grey
        ctx.lineWidth = 6;
        ctx.stroke();
    }

    function randomizeRings() {
        // Reset the game state
        internalBoard.forEach(row => row.fill(0, 0, row.length).fill(9, row.length, 11));
        rings = [];
        markers = [];
        markerSequences = [];
        clickableMarkers = [];
        selectMarkerState = false;
        removeRingState = false;
        playerToRemoveRing = null;
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

        // Function to print the board to the console
    function printBoard() {
        internalBoard.forEach(row => {
            let formattedRow = '';
            let cssStyles = [];

            row.forEach(cell => {
                if (cell === 9) {
                    formattedRow += '   '; // Replace 9 with spaces
                } else if (cell > 0) {
                    formattedRow += '%c' + cell + '%c '; // Positive numbers in green
                    cssStyles.push("color: green;", ""); // Style for positive numbers
                } else if (cell < 0){
                    formattedRow += '%c' + (-cell) + '%c '; // Negative numbers in red, turned positive
                    cssStyles.push("color: red;", ""); // Style for negative numbers
                } else {
                    formattedRow += '%c' + (-cell) + '%c '; // Negative numbers in red, turned positive
                    cssStyles.push("color: black;", ""); // Style for negative numbers
                }
            });

            console.log(formattedRow, ...cssStyles);
        });
    }

    drawGrid();
});
