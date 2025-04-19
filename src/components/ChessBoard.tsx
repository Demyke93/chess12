
interface ChessBoardProps {
  simplified?: boolean;
}

export const ChessBoard = ({ simplified = false }: ChessBoardProps) => {
  // For a simplified board, we'll just show a static board
  if (simplified) {
    return (
      <div className="w-full aspect-square grid grid-cols-8 grid-rows-8 border border-chess-brown">
        {[...Array(64)].map((_, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isLight = (row + col) % 2 === 0;
          
          return (
            <div 
              key={index} 
              className={`${isLight ? 'bg-chess-light' : 'bg-chess-brown'} flex items-center justify-center`}
            >
              {getPiece(row, col)}
            </div>
          );
        })}
      </div>
    );
  }
  
  // For a full board, we would implement the actual game logic
  // This would be connected to the Lichess API in the real implementation
  return (
    <div className="w-full aspect-square grid grid-cols-8 grid-rows-8 border border-chess-brown">
      {[...Array(64)].map((_, index) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        const isLight = (row + col) % 2 === 0;
        
        return (
          <div 
            key={index} 
            className={`${isLight ? 'bg-chess-light' : 'bg-chess-brown'} flex items-center justify-center relative`}
          >
            {getPiece(row, col)}
            {/* Column labels (a-h) at bottom row */}
            {row === 7 && (
              <div className="absolute bottom-0 right-0 text-xs p-0.5 opacity-70">
                {String.fromCharCode(97 + col)}
              </div>
            )}
            {/* Row numbers (1-8) at leftmost column */}
            {col === 0 && (
              <div className="absolute top-0 left-0 text-xs p-0.5 opacity-70">
                {8 - row}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Function to determine what piece should be displayed at a given position
function getPiece(row: number, col: number): JSX.Element | null {
  // Initial chess setup
  const pieces = [
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'], // White back row
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'], // White pawns
    [null, null, null, null, null, null, null, null], // Empty row
    [null, null, null, null, null, null, null, null], // Empty row
    [null, null, null, null, null, null, null, null], // Empty row
    [null, null, null, null, null, null, null, null], // Empty row
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'], // Black pawns
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜']  // Black back row
  ];
  
  const piece = pieces[row]?.[col];
  
  if (!piece) return null;
  
  return <span className="chess-piece text-2xl">{piece}</span>;
}
