class GameBoard {
    constructor(ctx, gridSize, margin) {
        this.ctx = ctx; // Canvas rendering context
        this.verticalSpacing = gridSize / 19; // Vertical spacing between grid points
        this.horizontalSpacing = gridSize / 11; // Horizontal spacing
        // Adjust the radius relative to cell size
        this.radius = Math.min(this.verticalSpacing, this.horizontalSpacing) * 0.1; // Radius of dots and rings
        this.margin = margin; // Margin around the grid
    }

    drawGridLines() {
        // Drawing logic for vertical, diagonal, and anti-diagonal lines
        // Set the style for the diagonal lines
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;

        // Draw the vertical lines
        this.drawLines(verticalGridLists);

        // Draw the diagonal lines
        this.drawLines(diagonalGridLists);

        // Draw the anti-diagonal lines
        this.drawLines(antiDiagonalGridLists);
    }

    drawLines(lineList) {
        this.ctx.strokeStyle = '#465767';
        lineList.forEach(line => {
            const [[startRow, startCol], [endRow, endCol]] = line;

            // Translate grid indices to canvas coordinates
            const startX = startCol * this.horizontalSpacing + this.horizontalSpacing / 2 + this.margin;
            const startY = startRow * this.verticalSpacing + this.verticalSpacing / 2 + this.margin;
            const endX = endCol * this.horizontalSpacing + this.horizontalSpacing / 2 + this.margin;
            const endY = endRow * this.verticalSpacing + this.verticalSpacing / 2 + this.margin;

            // Draw the line on the canvas
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        });
    }

    drawDots(possibleMoves = []) {
        // Logic to iterate over BOARD_TEMPLATE and draw dots
        // Set the style for the diagonal lines
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;

        // Loop over each row in the BOARD_TEMPLATE
        BOARD_TEMPLATE.forEach((columns, row) => {
            // Loop over each column index in the current row
            columns.forEach(column => {
                // Calculate the x and y position for each dot, based on the index
                // and account for the margin
                const x = column * this.horizontalSpacing + this.horizontalSpacing / 2 + this.margin;
                const y = row * this.verticalSpacing + this.verticalSpacing / 2 + this.margin;

                if (possibleMoves.some(point => point[0] === row && point[1] === column)) {
                    this.ctx.fillStyle = 'red'; // Set fill style for red circles
                } else {
                    this.ctx.fillStyle = '#111519'; // Set fill style for default circles
                }

                // Draw the dot
                this.ctx.beginPath();
                this.ctx.arc(x, y, this.radius * 0.9, 0, Math.PI * 2);
                this.ctx.fill();
            });
        });
    }

    drawHexagonBackground() {
        this.ctx.beginPath();
        const startY = hexagonVertices[0].y * this.verticalSpacing + this.verticalSpacing / 2 + this.margin;
        const startX = hexagonVertices[0].x * this.horizontalSpacing + this.horizontalSpacing / 2 + this.margin;
        this.ctx.moveTo(startX, startY);

        for (let i = 1; i < hexagonVertices.length; i++) {
            const y = hexagonVertices[i].y * this.verticalSpacing + this.verticalSpacing / 2 + this.margin;
            const x = hexagonVertices[i].x * this.horizontalSpacing + this.horizontalSpacing / 2 + this.margin;
            this.ctx.lineTo(x, y);
        }

        this.ctx.closePath(); // Closes the path to the starting point to form a shape
        this.ctx.fillStyle = '#C3D0D8';
        this.ctx.fill();
    }

    // Draw the rings on the board
    drawRings(rings) {
        // Drawing logic for hover and permanent rings
        rings.forEach(ring => {
            this.drawRing(ring.x, ring.y, ring.number, false);
        });
    }

    // Draw an individual ring
    drawRing(cx, cy, ringNumber) {
        let ringColor;
        let startGradientColor;
        if (ringNumber === 2) {
            ringColor = 'white';
            startGradientColor = '#f0f0f0';
        } else if (ringNumber === -2) {
            ringColor = 'black';
            startGradientColor = 'gray';
        }

        // Shadow for depth
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;

        // Gradient for a 3D effect
        let gradient = this.ctx.createRadialGradient(cx, cy, this.radius, cx, cy, 9 * this.radius);
        gradient.addColorStop(0, startGradientColor);
        gradient.addColorStop(1, ringColor);

        this.ctx.beginPath();
        this.ctx.arc(cx, cy, 8 * this.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = gradient;  // Permanent rings in white, hover effect in grey
        this.ctx.lineWidth = (5 * this.radius / 2);
        this.ctx.stroke();

        // Reset shadow properties
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }


    // Highlight rings for removal if in remove ring state
    drawRingsForRemoval(rings, currentPlayer) {
        rings.forEach(ring => {
            if (ring.number > 0 && currentPlayer === 1 || ring.number < 0 && currentPlayer === -1) {
                // Draw a red border around the ring
                this.ctx.strokeStyle = 'red';
                this.ctx.lineWidth = this.radius;
                this.ctx.beginPath();
                this.ctx.arc(ring.x, ring.y, 3 * this.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        });
    }

    drawMarkers(markers, clickableMarkers = []) {
        // Shadow for depth
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;

        markers.forEach(marker => {
            // Gradient for a 3D effect on markers
            let startGradientColor = marker.color !== 1 ? 'black' : '#E2E2E2'; // Darker for black markers, lighter for white markers
            let endGradientColor = marker.color !== 1 ? '#212121' : 'white';
            let gradient = this.ctx.createRadialGradient(marker.x, marker.y, this.radius, marker.x, marker.y, 6 * this.radius);
            gradient.addColorStop(0, startGradientColor);
            gradient.addColorStop(1, endGradientColor);

            // Drawing the marker with gradient
            this.ctx.beginPath();
            this.ctx.arc(marker.x, marker.y, 6 * this.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Draw the thin border (blue for regular, red for clickable)
            const isClickable = clickableMarkers.some(cm => cm.row === marker.row && cm.col === marker.col);
            this.ctx.strokeStyle = isClickable ? 'red' : '#004995';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });

        // Reset shadow properties
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    // Draw the entire board
    draw(rings, markers, possibleMoves = [], clickableMarkers = []) {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height); // Clear the canvas
        this.drawHexagonBackground();
        this.drawGridLines();
        this.drawDots(possibleMoves);
        this.drawRings(rings);
        this.drawMarkers(markers, clickableMarkers);
    }
}