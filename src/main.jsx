import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

import backgroundImage from '../images/background.png';
import boardImage from '../images/board.png';
import whitePieceImage from '../images/whitePiece.png';
import whiteCrownImage from '../images/whiteCrown.png';
import blackPieceImage from '../images/blackPiece.png';
import blackCrownImage from '../images/blackCrown.png';
import whiteMoveSound from '../sounds/whiteMove.mp3';
import blackMoveSound from '../sounds/blackMove.mp3';
import whiteVictorySound from '../sounds/whiteVictory.mp3';
import blackVictorySound from '../sounds/blackVictory.mp3';
import trashTalk1 from '../sounds/trashtalk/pt-br1.mp3';
import trashTalk2 from '../sounds/trashtalk/pt-br2.mp3';
import trashTalk3 from '../sounds/trashtalk/pt-br3.mp3';
import trashTalk4 from '../sounds/trashtalk/pt-br4.mp3';
import trashTalk5 from '../sounds/trashtalk/pt-br5.mp3';
import trashTalk6 from '../sounds/trashtalk/pt-br6.mp3';
import trashTalk7 from '../sounds/trashtalk/pt-br7.mp3';
import trashTalk8 from '../sounds/trashtalk/pt-br8.mp3';
import trashVictory1 from '../sounds/victorytalk/pt-br1.mp3';
import trashVictory2 from '../sounds/victorytalk/pt-br2.mp3';
import trashVictory3 from '../sounds/victorytalk/pt-br3.mp3';
import trashVictory4 from '../sounds/victorytalk/pt-br4.mp3';
import trashVictory5 from '../sounds/victorytalk/pt-br5.mp3';
import trashVictory6 from '../sounds/victorytalk/pt-br6.mp3';
import trashVictory7 from '../sounds/victorytalk/pt-br7.mp3';

const BOARD_SIZE = 8;
const HUMAN_PLAYER = 'white';
const AI_PLAYER = 'black';
const MINIMAX_DEEPNESS = 4;
const TRASH_THRESHOLD = 7;
const DIAGONAL_DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

const pieceImages = {
  white: {
    man: whitePieceImage,
    king: whiteCrownImage,
  },
  black: {
    man: blackPieceImage,
    king: blackCrownImage,
  },
};

const sounds = {
  white: {
    move: whiteMoveSound,
    victory: whiteVictorySound,
  },
  black: {
    move: blackMoveSound,
    victory: blackVictorySound,
  },
};

const trashTalkSounds = [
  trashTalk1,
  trashTalk2,
  trashTalk3,
  trashTalk4,
  trashTalk5,
  trashTalk6,
  trashTalk7,
  trashTalk8,
];

const trashVictorySounds = [
  trashVictory1,
  trashVictory2,
  trashVictory3,
  trashVictory4,
  trashVictory5,
  trashVictory6,
  trashVictory7,
];

function playSound(src) {
  const audio = new Audio(src);
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playRandomTrashTalk(currentDeep) {
  if (currentDeep > TRASH_THRESHOLD) {
    const sound = trashTalkSounds[Math.floor(Math.random() * trashTalkSounds.length)];
    playSound(sound);
  }
}

function playRandomVictoryTalk() {
  const sound = trashVictorySounds[Math.floor(Math.random() * trashVictorySounds.length)];
  playSound(sound);
}

function playTrashVictory(currentDeepness) {
  if (currentDeepness <= TRASH_THRESHOLD) {
    playSound(sounds.black.victory);
    return;
  }

  playRandomVictoryTalk();
}

function createInitialBoard() {
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => {
      if ((row + col) % 2 === 0) return null;
      if (row < 3) return { color: 'black', king: false };
      if (row > 4) return { color: 'white', king: false };
      return null;
    }),
  );
}

function isInside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function directionsFor(piece) {
  if (piece.king) return DIAGONAL_DIRECTIONS;

  return piece.color === 'white'
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ];
}

function getMoves(board, row, col, onlyJumps = false) {
  const piece = board[row][col];
  if (!piece) return [];

  const moves = [];

  if (piece.king) {
    DIAGONAL_DIRECTIONS.forEach(([rowDelta, colDelta]) => {
      let nextRow = row + rowDelta;
      let nextCol = col + colDelta;
      let captured = null;

      while (isInside(nextRow, nextCol)) {
        const target = board[nextRow][nextCol];

        if (!target) {
          if (captured) {
            moves.push({
              row: nextRow,
              col: nextCol,
              captured,
            });
          } else if (!onlyJumps) {
            moves.push({ row: nextRow, col: nextCol, captured: null });
          }
        } else {
          if (target.color === piece.color || captured) break;
          captured = { row: nextRow, col: nextCol };
        }

        nextRow += rowDelta;
        nextCol += colDelta;
      }
    });

    return moves;
  }

  DIAGONAL_DIRECTIONS.forEach(([rowDelta, colDelta]) => {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;
    const jumpRow = row + rowDelta * 2;
    const jumpCol = col + colDelta * 2;

    if (
      isInside(jumpRow, jumpCol) &&
      board[nextRow][nextCol] &&
      board[nextRow][nextCol].color !== piece.color &&
      !board[jumpRow][jumpCol]
    ) {
      moves.push({
        row: jumpRow,
        col: jumpCol,
        captured: { row: nextRow, col: nextCol },
      });
    }
  });

  if (onlyJumps) return moves;

  directionsFor(piece).forEach(([rowDelta, colDelta]) => {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;

    if (!onlyJumps && isInside(nextRow, nextCol) && !board[nextRow][nextCol]) {
      moves.push({ row: nextRow, col: nextCol, captured: null });
    }
  });

  return moves;
}

function playerHasJump(board, player) {
  return board.some((row, rowIndex) =>
    row.some((piece, colIndex) =>
      piece?.color === player && getMoves(board, rowIndex, colIndex, true).length > 0,
    ),
  );
}

function playerHasMove(board, player) {
  return board.some((row, rowIndex) =>
    row.some((piece, colIndex) => piece?.color === player && getMoves(board, rowIndex, colIndex).length > 0),
  );
}

function countPieces(board) {
  return board.flat().reduce(
    (counts, piece) => {
      if (piece) counts[piece.color] += 1;
      return counts;
    },
    { white: 0, black: 0 },
  );
}

function promoteIfNeeded(piece, row) {
  if (piece.king) return piece;
  if (piece.color === 'white' && row === 0) return { ...piece, king: true };
  if (piece.color === 'black' && row === BOARD_SIZE - 1) return { ...piece, king: true };
  return piece;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function applySingleMove(board, from, move) {
  const nextBoard = cloneBoard(board);
  const movingPiece = nextBoard[from.row][from.col];
  nextBoard[from.row][from.col] = null;
  if (move.captured) nextBoard[move.captured.row][move.captured.col] = null;
  nextBoard[move.row][move.col] = promoteIfNeeded(movingPiece, move.row);
  return nextBoard;
}

function collectJumpMoves(board, from, current, path = []) {
  const jumps = getMoves(board, current.row, current.col, true);

  if (jumps.length === 0) {
    return path.length ? [{ from, steps: path, board }] : [];
  }

  return jumps.flatMap((jump) => {
    const nextBoard = applySingleMove(board, current, jump);
    const nextPath = [...path, jump];
    return collectJumpMoves(nextBoard, from, { row: jump.row, col: jump.col }, nextPath);
  });
}

function getPlayerTurnMoves(board, player) {
  const mustJump = playerHasJump(board, player);
  const moves = [];

  board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (piece?.color !== player) return;

      const from = { row: rowIndex, col: colIndex };

      if (mustJump) {
        moves.push(...collectJumpMoves(board, from, from));
        return;
      }

      getMoves(board, rowIndex, colIndex).forEach((step) => {
        moves.push({
          from,
          steps: [step],
          board: applySingleMove(board, from, step),
        });
      });
    });
  });

  return moves;
}

function getWinnerForBoard(board, playerToMove) {
  const counts = countPieces(board);
  if (counts.white === 0) return 'black';
  if (counts.black === 0) return 'white';
  if (!playerHasMove(board, playerToMove)) return playerToMove === 'white' ? 'black' : 'white';
  return null;
}

function evaluateBoard(board) {
  const mobility = getPlayerTurnMoves(board, AI_PLAYER).length - getPlayerTurnMoves(board, HUMAN_PLAYER).length;

  return board.flat().reduce((score, piece, index) => {
    if (!piece) return score;

    const row = Math.floor(index / BOARD_SIZE);
    const directionScore = piece.color === AI_PLAYER ? row * 0.08 : (BOARD_SIZE - 1 - row) * 0.08;
    const pieceScore = (piece.king ? 1.75 : 1) + directionScore;

    return piece.color === AI_PLAYER ? score + pieceScore : score - pieceScore;
  }, mobility * 0.06);
}

function getAiMoveRankWeights(deepness) {
  const bestMoveWeight = Math.min(Math.max(deepness * 0.1, 0), 1);
  const otherMoveWeight = (1 - bestMoveWeight) / 2;

  return [
    { rank: 2, weight: otherMoveWeight },
    { rank: 1, weight: otherMoveWeight },
    { rank: 0, weight: bestMoveWeight },
  ];
}

function pickWeightedRankedMove(scoredMoves, maximizing, deepness) {
  const rankedMoves = [...scoredMoves].sort((a, b) => (
    maximizing ? b.score - a.score : a.score - b.score
  ));
  const weightedMoves = getAiMoveRankWeights(deepness)
    .map(({ rank, weight }) => ({ move: rankedMoves[rank]?.move, weight }))
    .filter(({ move }) => move);
  const totalWeight = weightedMoves.reduce((sum, { weight }) => sum + weight, 0);
  let roll = Math.random() * totalWeight;

  for (const { move, weight } of weightedMoves) {
    roll -= weight;
    if (roll <= 0) return move;
  }

  return weightedMoves.at(-1)?.move ?? null;
}

function minimax(board, player, depth, alpha = -Infinity, beta = Infinity, weightedMove = true) {
  const winner = getWinnerForBoard(board, player);

  if (winner === AI_PLAYER) return { score: 1000 + depth, move: null };
  if (winner === HUMAN_PLAYER) return { score: -1000 - depth, move: null };
  if (depth === 0) return { score: evaluateBoard(board), move: null };

  const moves = getPlayerTurnMoves(board, player);
  const maximizing = player === AI_PLAYER;
  let bestMove = null;
  let bestScore = maximizing ? -Infinity : Infinity;
  const nextPlayer = player === 'white' ? 'black' : 'white';
  const scoredMoves = weightedMove ? [] : null;

  for (const move of moves) {
    const result = minimax(move.board, nextPlayer, depth - 1, alpha, beta, false);
    scoredMoves?.push({ move, score: result.score });

    if (maximizing ? result.score > bestScore : result.score < bestScore) {
      bestScore = result.score;
      bestMove = move;
    }

    if (maximizing) {
      alpha = Math.max(alpha, bestScore);
    } else {
      beta = Math.min(beta, bestScore);
    }

    if (!weightedMove && beta <= alpha) break;
  }

  return {
    score: bestScore,
    move: weightedMove ? pickWeightedRankedMove(scoredMoves, maximizing, depth) : bestMove,
  };
}

function findBestAiMove(board, counts, matchWins, setMessage, setCurrentDeep) {
  // Adjusts by the match
  var newDeepness = MINIMAX_DEEPNESS;
  if(counts.white > counts.black + 2) {newDeepness++}
  if(counts.white > counts.black + 3) {newDeepness++}
  if(counts.white < counts.black - 2) {newDeepness--}
  if(counts.white < counts.black - 3) {newDeepness--}
  // Adjust by previous matches
  newDeepness = newDeepness + (matchWins.white - matchWins.black)*2;
  if(newDeepness < 1){newDeepness = 1}
  if(newDeepness > 10 ){newDeepness = 10}
  setCurrentDeep(newDeepness);
  setMessage("New deep: "+newDeepness);
  return minimax(board, AI_PLAYER, newDeepness).move;
}

function CheckersGame() {
  const [board, setBoard] = useState(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState(HUMAN_PLAYER);
  const [currentDeep, setCurrentDeep] = useState(MINIMAX_DEEPNESS);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('Jogador inicia a partida');
  const [matchWins, setMatchWins] = useState({ white: 0, black: 0 });
  const [winStreak, setWinStreak] = useState({ player: null, count: 0 });
  const lastWinnerRef = useRef(null);

  const requiredJump = useMemo(() => playerHasJump(board, currentPlayer), [board, currentPlayer]);
  const counts = useMemo(() => countPieces(board), [board]);
  const legalMoves = useMemo(() => {
    if (!selected) return [];
    return getMoves(board, selected.row, selected.col, requiredJump);
  }, [board, requiredJump, selected]);

  const winner = useMemo(() => {
    if (counts.white === 0) return 'black';
    if (counts.black === 0) return 'white';
    if (!playerHasMove(board, currentPlayer)) return currentPlayer === 'white' ? 'black' : 'white';
    return null;
  }, [board, counts.black, counts.white, currentPlayer]);

  const resetGame = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer(HUMAN_PLAYER);
    setSelected(null);
    setMessage('Jogador inicia a partida');
    lastWinnerRef.current = null;
  };

  useEffect(() => {
    if (!winner || lastWinnerRef.current === winner) return;

    lastWinnerRef.current = winner;
    setMatchWins((wins) => ({
      ...wins,
      [winner]: wins[winner] + 1,
    }));
    setWinStreak((streak) =>
      streak.player === winner
        ? { player: winner, count: streak.count + 1 }
        : { player: winner, count: 1 },
    );
    if (winner === AI_PLAYER) {
      playTrashVictory(currentDeep);
      return;
    }

    playSound(sounds[winner].victory);
  }, [winner, currentDeep]);

  useEffect(() => {
    if (currentPlayer !== AI_PLAYER || winner) return;

    setSelected(null);
    setMessage('Computador está pensando');

    const timer = window.setTimeout(() => {
      const aiMove = findBestAiMove(board, counts, matchWins, setMessage, setCurrentDeep);

      if (!aiMove) {
        setMessage('Vitórias');
        playSound(sounds.white.victory);
        return;
      }

      const blackWonWithMove = getWinnerForBoard(aiMove.board, HUMAN_PLAYER) === AI_PLAYER;

      setBoard(aiMove.board);
      setCurrentPlayer(HUMAN_PLAYER);
      setMessage('Sua vez');

      if (blackWonWithMove) return;

      playSound(sounds.black.move);
      if (aiMove.steps.some((step) => step.captured)) {
        playRandomTrashTalk(currentDeep);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [board, currentPlayer, winner]);

  const selectPiece = (row, col) => {
    const piece = board[row][col];

    if (currentPlayer === AI_PLAYER || !piece || piece.color !== currentPlayer || winner) return;

    const moves = getMoves(board, row, col, requiredJump);
    setSelected({ row, col });
    setMessage(
      moves.length
        ? `${capitalize(currentPlayer)} selected`
        : requiredJump
          ? 'Você deve comer a peça'
          : 'Essa peça não pode se movimentar',
    );
  };

  const moveSelectedPiece = (targetRow, targetCol) => {
    if (currentPlayer === AI_PLAYER || !selected || winner) return;

    const move = legalMoves.find(({ row, col }) => row === targetRow && col === targetCol);
    if (!move) return;

    const nextBoard = cloneBoard(board);
    const movingPiece = nextBoard[selected.row][selected.col];
    nextBoard[selected.row][selected.col] = null;
    if (move.captured) nextBoard[move.captured.row][move.captured.col] = null;
    nextBoard[targetRow][targetCol] = promoteIfNeeded(movingPiece, targetRow);

    const continuingJumps = move.captured ? getMoves(nextBoard, targetRow, targetCol, true) : [];
    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';

    setBoard(nextBoard);
    playSound(sounds[currentPlayer].move);

    if (continuingJumps.length > 0) {
      setSelected({ row: targetRow, col: targetCol });
      setMessage(`${capitalize(currentPlayer)} pode capturar de novo`);
      return;
    }

    setSelected(null);
    setCurrentPlayer(nextPlayer);
    setMessage(`Vez do ${capitalize(nextPlayer)}`);
  };

  const handleSquareClick = (row, col) => {
    if (selected && legalMoves.some((move) => move.row === row && move.col === col)) {
      moveSelectedPiece(row, col);
      return;
    }

    selectPiece(row, col);
  };

  return (
    <main className="app" style={{ '--background-image': `url(${backgroundImage})` }}>
      <section className="game-shell" aria-label="MM damas">
        <div className="scorebar">
          <div className={currentPlayer === 'white' ? 'score active' : 'score'}>
            <span>Vitórias</span>
            <strong>{matchWins.white}</strong>
          </div>
          <div className="status">
            <span>{winner ? `${capitalize(winner)} wins` : message}</span>
            <small>{streakText(winStreak)}</small>
            <button type="button" onClick={resetGame}>
              Nova Partida 
            </button>
          </div>
          <div className={currentPlayer === 'black' ? 'score active' : 'score'}>
            <span>Derrotas</span>
            <strong>{matchWins.black}</strong>
          </div>
        </div>

        <div className="board-wrap">
          <img className="board-image" src={boardImage} alt="" aria-hidden="true" />
          <div className="board-grid" role="grid" aria-label="Checkers board">
            {board.map((row, rowIndex) =>
              row.map((piece, colIndex) => {
                const isSelected = selected?.row === rowIndex && selected?.col === colIndex;
                const legalMove = legalMoves.find((move) => move.row === rowIndex && move.col === colIndex);
                const isDark = (rowIndex + colIndex) % 2 === 1;

                return (
                  <button
                    className={[
                      'square',
                      isDark ? 'dark' : 'light',
                      isSelected ? 'selected' : '',
                      legalMove ? 'move-target' : '',
                      legalMove?.captured ? 'capture-target' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    role="gridcell"
                    aria-label={squareLabel(rowIndex, colIndex, piece, legalMove)}
                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                  >
                    {piece && (
                      <img
                        className="piece"
                        src={pieceImages[piece.color][piece.king ? 'king' : 'man']}
                        alt={`${piece.color} ${piece.king ? 'king' : 'piece'}`}
                        draggable="false"
                      />
                    )}
                  </button>
                );
              }),
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function squareLabel(row, col, piece, legalMove) {
  const position = `${String.fromCharCode(65 + col)}${BOARD_SIZE - row}`;
  if (piece) return `${position}, ${piece.color} ${piece.king ? 'king' : 'piece'}`;
  if (legalMove?.captured) return `${position}, capture target`;
  if (legalMove) return `${position}, move target`;
  return `${position}, empty`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function streakText(streak) {
  if (!streak.player) return 'Streak - 0';
  return `${capitalize(streak.player)} - ${streak.count}`;
}

createRoot(document.getElementById('root')).render(<CheckersGame />);
