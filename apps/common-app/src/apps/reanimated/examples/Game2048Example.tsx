import React from 'react';
import type { ColorValue } from 'react-native';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated';

const N = 4;
const TILE_SIZE = 72;
const GAP = 10;
const CELL_BORDER_RADIUS = 5;
const CELL_BACKGROUND_COLOR = 'rgb(202,192,181)';
const CELL_BORDER_COLOR = 'rgb(185,173,161)';

interface Tile {
  id: number;
  row: number;
  column: number;
  value: number;
  zombie: boolean;
  hasJustBeenMerged: boolean;
}

enum Directions {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

let nextid = 1;

function makeId(): number {
  return nextid++;
}

function extractRow(tiles: Tile[], row: number): Tile[] {
  return tiles.filter((tile) => tile.row === row);
}

function areTilesEqual(tiles1: Tile[], tiles2: Tile[]): boolean {
  if (tiles1.length !== tiles2.length) {
    return false;
  }
  sortTiles(tiles1);
  sortTiles(tiles2);
  for (let i = 0; i < tiles1.length; i++) {
    if (
      tiles1[i].id !== tiles2[i].id ||
      tiles1[i].column !== tiles2[i].column ||
      tiles1[i].row !== tiles2[i].row
    ) {
      return false;
    }
  }
  return true;
}

function moveRowLeft(oldTiles: Tile[]): Tile[] {
  if (oldTiles.some((tile) => tile.zombie)) {
    throw new Error('Unexpected zombie tile');
  }
  const newTiles: Tile[] = [];
  const oldTilesSortedByColumn = oldTiles.sort((a, b) => a.column - b.column);
  let nextColumn = 0;
  for (let i = 0; i < oldTilesSortedByColumn.length; i++) {
    const thisTile = oldTilesSortedByColumn[i];
    const nextTile = oldTilesSortedByColumn[i + 1];
    if (nextTile !== undefined && thisTile.value === nextTile.value) {
      // merge tiles
      newTiles.push({ ...thisTile, column: nextColumn, zombie: true });
      newTiles.push({ ...nextTile, column: nextColumn, zombie: true });
      newTiles.push({
        id: makeId(),
        row: thisTile.row,
        column: nextColumn,
        value: thisTile.value * 2,
        zombie: false,
        hasJustBeenMerged: true,
      });
      i++; // skip next tile
    } else {
      newTiles.push({
        ...thisTile,
        column: nextColumn,
        hasJustBeenMerged: false,
      });
    }
    nextColumn++;
  }
  return newTiles;
}

function addRandomTile(oldTiles: Tile[]): Tile[] {
  const MAX = N * N;
  const taken = oldTiles.map((tile) => tile.row * N + tile.column);
  const free = [...new Array(MAX)]
    .map((_, i) => i)
    .filter((i) => !taken.includes(i));
  if (free.length === 0) {
    throw new Error('No empty cells');
  }
  const idx = free[Math.floor(Math.random() * free.length)];
  const row = Math.floor(idx / N);
  const column = idx % N;
  const value = Math.random() < 0.5 ? 4 : 2;
  return oldTiles.concat({
    row,
    column,
    value,
    id: makeId(),
    zombie: false,
    hasJustBeenMerged: false,
  });
}

function filterOutZombieTiles(tiles: Tile[]): Tile[] {
  return tiles.filter((tile) => !tile.zombie);
}

function flipTilesVertically(tiles: Tile[]): Tile[] {
  return tiles.map((tile) => ({ ...tile, column: N - 1 - tile.column }));
}

function transposeTiles(tiles: Tile[]): Tile[] {
  return tiles.map((tile) => ({ ...tile, row: tile.column, column: tile.row }));
}

function transformTiles(
  tiles: Tile[],
  direction: Directions,
  reverse: boolean
): Tile[] {
  switch (direction) {
    case Directions.LEFT:
      return tiles;
    case Directions.RIGHT:
      return flipTilesVertically(tiles);
    case Directions.UP:
      return transposeTiles(tiles);
    case Directions.DOWN:
      return reverse
        ? transposeTiles(flipTilesVertically(tiles))
        : flipTilesVertically(transposeTiles(tiles));
  }
}

function makeMove(oldTiles: Tile[], direction: Directions): Tile[] {
  oldTiles = transformTiles(oldTiles, direction, false);
  let newTiles: Tile[] = [];
  const aliveTiles = filterOutZombieTiles(oldTiles);
  for (let row = 0; row < 4; row++) {
    const oldRow = extractRow(aliveTiles, row);
    const newRow = moveRowLeft(oldRow);
    newTiles = newTiles.concat(newRow);
  }
  if (!areTilesEqual(aliveTiles, newTiles)) {
    newTiles = addRandomTile(newTiles);
  }
  newTiles = transformTiles(newTiles, direction, true);
  return sortTiles(newTiles);
}

function sortTiles(tiles: Tile[]): Tile[] {
  return tiles.sort((a, b) => a.id - b.id);
}

function getTileBackgroundColor(value: number): ColorValue {
  switch (value) {
    case 2:
      return 'rgb(236,228,219)';
    case 4:
      return 'rgb(234,224,202)';
    case 8:
      return 'rgb(232,180,129)';
    case 16:
      return 'rgb(231,154,109)';
    case 32:
      return 'rgb(230,130,102)';
    case 64:
      return 'rgb(228,104,71)';
    case 128:
      return 'rgb(232,208,127)';
    case 256:
      return 'rgb(231,205,113)';
    case 512:
      return 'rgb(231,201,100)';
    case 1024:
      return 'rgb(230,198,89)';
    case 2048:
      return 'rgb(230,195,79)';
    default:
      return 'rgb(60,56,50)';
  }
}

function getTileForegroundColor(value: number): ColorValue {
  return value <= 4 ? 'rgb(117,111,102)' : 'rgb(249,246,243)';
}

function getDirection(dx: number, dy: number) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? Directions.RIGHT : Directions.LEFT;
  } else {
    return dy > 0 ? Directions.DOWN : Directions.UP;
  }
}

function makeInitialBoard(): Tile[] {
  return addRandomTile(addRandomTile([]));
}

function isBoardFull(tiles: Tile[]): boolean {
  return filterOutZombieTiles(tiles).length === N * N;
}

function getPoints(tiles: Tile[]): number {
  return filterOutZombieTiles(tiles).reduce((acc, tile) => acc + tile.value, 0);
}

export default function Game2048Example() {
  const [tiles, setTiles] = React.useState(makeInitialBoard);
  const [gameOver, setGameOver] = React.useState(false);

  const handleReset = React.useCallback(() => {
    setTiles(makeInitialBoard());
    setGameOver(false);
  }, []);

  const fling = Gesture.Pan()
    .runOnJS(true)
    .onEnd((e) => {
      if (gameOver) {
        return;
      }
      const direction = getDirection(e.translationX, e.translationY);
      const nextTiles = makeMove(tiles, direction);
      setTiles(nextTiles);
      if (isBoardFull(nextTiles)) {
        setGameOver(true);
        setTimeout(() => {
          Alert.alert('Game over!', `${getPoints(tiles)} points`, [
            { text: 'Play again', onPress: handleReset },
          ]);
        }, 500);
      }
    });

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={fling}>
        <View style={styles.board}>
          {[...new Array(N)].map((_, row) => (
            <View key={row} style={styles.row}>
              {[...new Array(N)].map((_, column) => (
                <View key={column} style={styles.cell} />
              ))}
            </View>
          ))}
          {tiles.map((tile) => (
            <Animated.View
              style={[
                styles.tile,
                {
                  top: tile.row * (TILE_SIZE + GAP) + GAP,
                  left: tile.column * (TILE_SIZE + GAP) + GAP,
                  zIndex: tile.zombie ? 1 : 2,
                  backgroundColor: getTileBackgroundColor(tile.value),
                },
              ]}
              entering={
                tile.hasJustBeenMerged
                  ? ZoomIn.springify(200).dampingRatio(0.6).delay(150)
                  : ZoomIn.duration(150).delay(150)
              }
              layout={LinearTransition.duration(120)}
              key={tile.id}>
              <Text
                style={[
                  styles.value,
                  { color: getTileForegroundColor(tile.value) },
                ]}>
                {tile.value}
              </Text>
            </Animated.View>
          ))}
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    backgroundColor: CELL_BORDER_COLOR,
    borderRadius: GAP,
    padding: GAP,
    gap: GAP,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    backgroundColor: CELL_BACKGROUND_COLOR,
    borderRadius: CELL_BORDER_RADIUS,
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: CELL_BORDER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  value: {
    fontSize: 35,
    fontWeight: 'bold',
  },
});
