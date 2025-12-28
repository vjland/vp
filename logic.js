
export const Suit = {
    Spades: '♠',
    Hearts: '♥',
    Diamonds: '♦',
    Clubs: '♣',
};

export const Winner = {
    Player: 'P',
    Banker: 'B',
    Tie: 'T'
};

export const BetTarget = {
    Player: 'Player',
    Banker: 'Banker',
    Tie: 'Tie',
    PlayerPair: 'Player Pair',
    BankerPair: 'Banker Pair'
};

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const getCardValue = (rank) => {
    if (rank === 'A') return 1;
    if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
    return parseInt(rank);
};

export const createShoe = (decks = 8) => {
    const shoe = [];
    const suits = Object.values(Suit);
    for (let i = 0; i < decks; i++) {
        for (const suit of suits) {
            for (const rank of RANKS) {
                shoe.push({ suit, rank, value: getCardValue(rank) });
            }
        }
    }
    return shuffle(shoe);
};

const shuffle = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

export const calculateScore = (cards) => {
    const total = cards.reduce((sum, card) => sum + card.value, 0);
    return total % 10;
};

export const playHand = (shoe) => {
    const playerCards = [shoe[0], shoe[2]];
    const bankerCards = [shoe[1], shoe[3]];
    let used = 4;

    let pScore = calculateScore(playerCards);
    let bScore = calculateScore(bankerCards);

    // Baccarat Rules
    if (pScore < 8 && bScore < 8) {
        let pThird = null;
        if (pScore <= 5) {
            pThird = shoe[used++];
            playerCards.push(pThird);
            pScore = calculateScore(playerCards);
        }

        // Banker's Rule
        let shouldBankerDraw = false;
        if (pThird === null) {
            shouldBankerDraw = bScore <= 5;
        } else {
            const pv = pThird.value;
            if (bScore <= 2) shouldBankerDraw = true;
            else if (bScore === 3) shouldBankerDraw = pv !== 8;
            else if (bScore === 4) shouldBankerDraw = [2, 3, 4, 5, 6, 7].includes(pv);
            else if (bScore === 5) shouldBankerDraw = [4, 5, 6, 7].includes(pv);
            else if (bScore === 6) shouldBankerDraw = [6, 7].includes(pv);
        }

        if (shouldBankerDraw) {
            bankerCards.push(shoe[used++]);
            bScore = calculateScore(bankerCards);
        }
    }

    let winner = Winner.Tie;
    if (pScore > bScore) winner = Winner.Player;
    else if (bScore > pScore) winner = Winner.Banker;

    return {
        result: {
            winner,
            playerScore: pScore,
            bankerScore: bScore,
            playerCards: [...playerCards],
            bankerCards: [...bankerCards],
            isPairPlayer: playerCards[0].rank === playerCards[1].rank,
            isPairBanker: bankerCards[0].rank === bankerCards[1].rank,
        },
        usedCards: used
    };
};

export const generateBigRoad = (history) => {
    const matrix = Array.from({ length: 6 }, () => Array(200).fill(null));
    const path = [];
    
    let col = 0;
    let row = 0;
    let streakStartCol = 0;
    let logicalCol = -1;
    let lastWinner = null;
    let isFirstHand = true;

    history.forEach((res) => {
        if (res.winner === Winner.Tie) {
            if (path.length > 0) {
                const last = path[path.length - 1];
                const entry = matrix[last.r][last.c];
                if (entry) entry.ties++;
            } else {
                matrix[0][0] = { winner: Winner.Tie, ties: 1 };
                path.push({ r: 0, c: 0, logicalCol: 0, winner: Winner.Tie });
            }
            return;
        }

        if (isFirstHand) {
            logicalCol = 0;
            if (matrix[0][0] && matrix[0][0].winner === Winner.Tie) {
                matrix[0][0].winner = res.winner;
            } else {
                matrix[0][0] = { winner: res.winner, ties: 0 };
            }
            path.push({ r: 0, c: 0, logicalCol: 0, winner: res.winner });
            lastWinner = res.winner;
            isFirstHand = false;
        } else {
            if (res.winner === lastWinner) {
                if (row < 5 && matrix[row + 1][col] === null) {
                    row++;
                } else {
                    col++;
                }
            } else {
                logicalCol++;
                row = 0;
                col = streakStartCol + 1;
                while (matrix[0][col] !== null) col++;
                streakStartCol = col;
            }
            matrix[row][col] = { winner: res.winner, ties: 0 };
            path.push({ r: row, c: col, logicalCol, winner: res.winner });
            lastWinner = res.winner;
        }
    });

    return { matrix, path };
};

const getColumnHeight = (matrix, col) => {
    if (col < 0) return 0;
    let height = 0;
    for (let r = 0; r < 6; r++) {
        if (matrix[r][col] !== null) height++;
    }
    return height;
};

export const generateDerivedRoad = (bigRoadMatrix, path, offset) => {
    const derivedMatrix = Array.from({ length: 6 }, () => Array(200).fill(null));
    const validPath = path.filter(p => p.winner !== Winner.Tie);
    if (validPath.length === 0) return derivedMatrix;

    let dCol = 0;
    let dRow = 0;
    let dStreakStartCol = 0;
    let lastColor = null;

    validPath.forEach((current) => {
        if (current.logicalCol < offset || (current.logicalCol === offset && current.r === 0)) {
            return;
        }

        let color = 'blue';

        if (current.r > 0) {
            const cellLeft = bigRoadMatrix[current.r][current.c - offset];
            const cellAboveLeft = bigRoadMatrix[current.r - 1][current.c - offset];
            if ((cellLeft !== null) === (cellAboveLeft !== null)) {
                color = 'red';
            } else {
                color = 'blue';
            }
        } else {
            const h1 = getColumnHeight(bigRoadMatrix, current.c - 1);
            const h2 = getColumnHeight(bigRoadMatrix, current.c - 1 - offset);
            color = (h1 === h2) ? 'red' : 'blue';
        }

        if (lastColor === null) {
            dRow = 0; dCol = 0; dStreakStartCol = 0;
            derivedMatrix[dRow][dCol] = color;
            lastColor = color;
        } else if (color === lastColor) {
            if (dRow < 5 && derivedMatrix[dRow + 1][dCol] === null) {
                dRow++;
            } else {
                dCol++;
            }
            derivedMatrix[dRow][dCol] = color;
        } else {
            dRow = 0;
            dCol = dStreakStartCol + 1;
            while (derivedMatrix[0][dCol] !== null) dCol++;
            dStreakStartCol = dCol;
            derivedMatrix[dRow][dCol] = color;
            lastColor = color;
        }
    });

    return derivedMatrix;
};
