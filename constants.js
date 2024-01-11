//For defining the valid points on a 19 x 11 board
const BOARD_TEMPLATE = [
    [4, 6], [3, 5, 7], [2, 4, 6, 8], [1, 3, 5, 7, 9], [2, 4, 6, 8],
    [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10], [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10],
    [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10], [1, 3, 5, 7, 9], [0, 2, 4, 6, 8, 10],
    [1, 3, 5, 7, 9], [2, 4, 6, 8], [1, 3, 5, 7, 9], [2, 4, 6, 8], [3, 5, 7], [4, 6]
];

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

// Representing the board in a 19x11 grid
const internalBoard = new Array(19).fill(0).map(() => new Array(11).fill(9));
BOARD_TEMPLATE.forEach((columns, row) => {
    columns.forEach(column => {
        internalBoard[row][column] = 0; // Mark valid coordinates
    });
});

// For drawing the grid lines of on the hexagonal board
const verticalGridLists = [
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
const diagonalGridLists = [
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
const antiDiagonalGridLists = [
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

// For traversing across the vertical, diagonal, and anti-diagonal directions.

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