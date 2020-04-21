defmodule Whiteboard.Boards.BoardsBehaviour do
  @callback get_board_strokes(String.t) :: [Map.t]
  @callback add_stroke(String.t, Map.t) :: any
  @callback undo_stroke(String.t) :: any
  @callback reset_board(String.t) :: any
end
